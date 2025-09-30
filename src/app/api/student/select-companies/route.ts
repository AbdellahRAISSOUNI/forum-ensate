import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { Interview } from '@/models/Interview';
import { Company } from '@/models/Company';
import { User } from '@/models/User';

// Priority calculation function
function calculatePriority(user: { isCommittee: boolean; status?: string; opportunityType?: string }): number {
  let priority = 0;
  
  // Committee member has highest priority
  if (user.isCommittee) {
    priority += 1000;
  }
  
  // Student status priority
  if (user.status === 'ENSA') {
    priority += 100;
  } else if (user.status === 'EXTERNE') {
    priority += 50;
  }
  
  // Opportunity type priority
  if (user.opportunityType === 'PFA') {
    priority += 30;
  } else if (user.opportunityType === 'PFE') {
    priority += 25;
  } else if (user.opportunityType === 'EMPLOI') {
    priority += 20;
  } else if (user.opportunityType === 'STAGE_OBSERVATION') {
    priority += 10;
  }
  
  return priority;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux étudiants' }, { status: 403 });
    }

    const { companyIds } = await request.json();

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json({ 
        error: 'Veuillez sélectionner au moins une entreprise' 
      }, { status: 400 });
    }

    await connectToDatabase();

    // Get user details for priority calculation
    const user = await User.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Verify companies exist
    const companies = await Company.find({
      _id: { $in: companyIds },
      isActive: true
    }).lean();

    if (companies.length !== companyIds.length) {
      return NextResponse.json({ 
        error: 'Certaines entreprises sélectionnées ne sont pas disponibles' 
      }, { status: 400 });
    }

    // Check for existing interviews
    const existingInterviews = await Interview.find({
      student: session.user.id,
      company: { $in: companyIds },
      status: { $in: ['WAITING', 'IN_PROGRESS'] }
    }).lean();

    if (existingInterviews.length > 0) {
      return NextResponse.json({ 
        error: 'Vous avez déjà sélectionné certaines de ces entreprises' 
      }, { status: 400 });
    }

    // Calculate priority for this user
    const userPriority = calculatePriority({
      isCommittee: !!(user as { isCommittee?: boolean }).isCommittee,
      status: (user as { status?: string }).status,
      opportunityType: (user as { opportunityType?: string }).opportunityType
    });

    // Create interviews for each selected company
    const createdInterviews = [];

    for (const companyId of companyIds) {
      // Get current queue for this company
      const currentQueue = await Interview.find({
        company: companyId,
        status: { $in: ['WAITING', 'IN_PROGRESS'] }
      }).sort({ priority: -1, createdAt: 1 }).lean();

      // Find position based on priority using alternating pattern
      let queuePosition = 1;
      
      if (currentQueue.length > 0) {
        // Find position where this user should be inserted based on priority
        const insertIndex = currentQueue.findIndex(interview => interview.priority < userPriority);
        
        if (insertIndex === -1) {
          // Lower priority than all existing, goes to end
          queuePosition = currentQueue.length + 1;
        } else {
          // Insert at the found position
          queuePosition = insertIndex + 1;
          
          // Update positions of interviews that come after
          await Interview.updateMany(
            {
              company: companyId,
              status: { $in: ['WAITING', 'IN_PROGRESS'] },
              queuePosition: { $gte: queuePosition }
            },
            {
              $inc: { queuePosition: 1 }
            }
          );
        }
      }

      // Create the interview
      const interview = new Interview({
        student: session.user.id,
        company: companyId,
        status: 'WAITING',
        queuePosition,
        priority: userPriority,
        notificationSent: false
      });

      await interview.save();
      createdInterviews.push(interview);
    }

    // Populate company details for response
    const populatedInterviews = await Interview.find({
      _id: { $in: createdInterviews.map(i => i._id) }
    }).populate('company').lean();

    const responseData = populatedInterviews.map((interview) => {
      const interviewData = interview as unknown as {
        queuePosition: number;
        company: { 
          name: string; 
          estimatedInterviewDuration?: number; 
        };
      };
      return {
        companyName: interviewData.company.name,
        queuePosition: interviewData.queuePosition,
        estimatedWaitTime: Math.max(0, (interviewData.queuePosition - 1) * (interviewData.company.estimatedInterviewDuration || 30))
      };
    });

    return NextResponse.json({
      message: 'Entreprises sélectionnées avec succès',
      interviews: responseData
    });

  } catch (error) {
    console.error('Error selecting companies:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sélection des entreprises' },
      { status: 500 }
    );
  }
}
