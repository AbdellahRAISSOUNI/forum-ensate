import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Interview } from '@/models/Interview';
import { Company } from '@/models/Company';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux administrateurs' }, { status: 403 });
    }

    await connectToDatabase();

    // Get basic counts
    const [
      totalStudents,
      totalInterviews,
      interviewsInProgress,
      interviewsCompleted,
      activeCompanies,
      companies,
      interviews
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ['student', 'committee'] } }),
      Interview.countDocuments({}),
      Interview.countDocuments({ status: 'IN_PROGRESS' }),
      Interview.countDocuments({ status: 'COMPLETED' }),
      Company.countDocuments({ isActive: true }),
      Company.find({ isActive: true }).lean(),
      Interview.find({})
        .populate('company', 'name')
        .populate('student', 'name')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Interviews by company
    const interviewsByCompany = companies.map(company => ({
      name: company.name,
      count: interviews.filter(interview => {
        const companyData = interview.company as unknown as { _id: string; name: string };
        return companyData && companyData._id.toString() === company._id.toString();
      }).length
    })).filter(item => item.count > 0);

    // Status distribution
    const statusCounts = {
      WAITING: interviews.filter(i => i.status === 'WAITING').length,
      IN_PROGRESS: interviews.filter(i => i.status === 'IN_PROGRESS').length,
      COMPLETED: interviews.filter(i => i.status === 'COMPLETED').length,
      CANCELLED: interviews.filter(i => i.status === 'CANCELLED').length
    };

    const statusDistribution = [
      { name: 'En attente', value: statusCounts.WAITING, color: '#FFBB28' },
      { name: 'En cours', value: statusCounts.IN_PROGRESS, color: '#00C49F' },
      { name: 'Terminé', value: statusCounts.COMPLETED, color: '#0088FE' },
      { name: 'Annulé', value: statusCounts.CANCELLED, color: '#FF8042' }
    ].filter(item => item.value > 0);

    // Hourly flow (last 24 hours)
    const now = new Date();
    const hourlyFlow = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const hourStart = new Date(hour);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const count = interviews.filter(interview => {
        const interviewTime = interview.startedAt || interview.createdAt;
        return interviewTime && 
               new Date(interviewTime) >= hourStart && 
               new Date(interviewTime) < hourEnd;
      }).length;

      hourlyFlow.push({
        hour: hourStart.getHours().toString().padStart(2, '0') + ':00',
        count
      });
    }

    // Recent activity (last 10 activities)
    const recentActivity = interviews
      .filter(interview => interview.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
      .map(interview => {
        const student = interview.student as unknown as { _id: string; name: string };
        const company = interview.company as unknown as { _id: string; name: string };
        
        let message = '';
        switch (interview.status) {
          case 'WAITING':
            message = `${student?.name || 'Étudiant'} s'est inscrit pour ${company?.name || 'une entreprise'}`;
            break;
          case 'IN_PROGRESS':
            message = `Entretien démarré: ${student?.name || 'Étudiant'} avec ${company?.name || 'une entreprise'}`;
            break;
          case 'COMPLETED':
            message = `Entretien terminé: ${student?.name || 'Étudiant'} avec ${company?.name || 'une entreprise'}`;
            break;
          case 'CANCELLED':
            message = `Entretien annulé: ${student?.name || 'Étudiant'} avec ${company?.name || 'une entreprise'}`;
            break;
          default:
            message = `Mise à jour d'entretien: ${student?.name || 'Étudiant'}`;
        }

        return {
          id: interview._id.toString(),
          type: interview.status,
          message,
          timestamp: interview.updatedAt,
          studentName: student?.name,
          companyName: company?.name
        };
      });

    return NextResponse.json({
      totalStudents,
      totalInterviews,
      interviewsInProgress,
      interviewsCompleted,
      activeCompanies,
      interviewsByCompany,
      statusDistribution,
      hourlyFlow,
      recentActivity
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
