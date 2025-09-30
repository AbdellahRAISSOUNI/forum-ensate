import { connectToDatabase } from '@/lib/mongodb';
import { Interview } from '@/models/Interview';
import { Room } from '@/models/Room';
import { Types } from 'mongoose';
import { assignQueuePositions } from './queueManager';

export async function startInterview(
  interviewId: string | Types.ObjectId,
  committeeId: string | Types.ObjectId
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const interviewObjectId = new Types.ObjectId(interviewId);
    const committeeObjectId = new Types.ObjectId(committeeId);

    // Find the interview
    const interview = await Interview.findById(interviewObjectId)
      .populate('company')
      .populate('student');

    if (!interview) {
      return { success: false, error: 'Entretien non trouvé' };
    }

    // Check if interview is in correct state
    if (interview.status !== 'WAITING') {
      return { success: false, error: 'L\'entretien ne peut pas être démarré' };
    }

    // Find the room assigned to this company
    const room = await Room.findOne({ company: interview.company });
    if (!room) {
      return { success: false, error: 'Aucune salle assignée à cette entreprise' };
    }

    // Validate committee member has access to this room
    const hasAccess = room.committeeMembers.some(
      (memberId) => memberId.toString() === committeeObjectId.toString()
    );

    if (!hasAccess) {
      return { success: false, error: 'Accès non autorisé à cette salle' };
    }

    // Check if there's already an interview in progress in this room
    if (room.currentInterview) {
      return { success: false, error: 'Un entretien est déjà en cours dans cette salle' };
    }

    // Update interview status
    interview.status = 'IN_PROGRESS';
    interview.startedAt = new Date();
    await interview.save();

    // Update room's current interview
    room.currentInterview = interviewObjectId;
    await room.save();

    return { success: true };
  } catch (error) {
    console.error('Error starting interview:', error);
    return { success: false, error: 'Erreur lors du démarrage de l\'entretien' };
  }
}

export async function endInterview(
  interviewId: string | Types.ObjectId,
  committeeId: string | Types.ObjectId
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const interviewObjectId = new Types.ObjectId(interviewId);
    const committeeObjectId = new Types.ObjectId(committeeId);

    // Find the interview
    const interview = await Interview.findById(interviewObjectId)
      .populate('company');

    if (!interview) {
      return { success: false, error: 'Entretien non trouvé' };
    }

    // Check if interview is in correct state
    if (interview.status !== 'IN_PROGRESS') {
      return { success: false, error: 'L\'entretien n\'est pas en cours' };
    }

    // Find the room
    const room = await Room.findOne({ company: interview.company });
    if (!room) {
      return { success: false, error: 'Salle non trouvée' };
    }

    // Validate committee member has access
    const hasAccess = room.committeeMembers.some(
      (memberId) => memberId.toString() === committeeObjectId.toString()
    );

    if (!hasAccess) {
      return { success: false, error: 'Accès non autorisé à cette salle' };
    }

    // Update interview status
    interview.status = 'COMPLETED';
    interview.completedAt = new Date();
    await interview.save();

    // Clear room's current interview
    room.currentInterview = undefined;
    await room.save();

    // Recalculate queue positions for the company
    await assignQueuePositions(interview.company);

    return { success: true };
  } catch (error) {
    console.error('Error ending interview:', error);
    return { success: false, error: 'Erreur lors de la fin de l\'entretien' };
  }
}

export async function markStudentAbsent(
  interviewId: string | Types.ObjectId
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const interviewObjectId = new Types.ObjectId(interviewId);

    // Find the interview
    const interview = await Interview.findById(interviewObjectId)
      .populate('company');

    if (!interview) {
      return { success: false, error: 'Entretien non trouvé' };
    }

    // Check if interview is in waiting state
    if (interview.status !== 'WAITING') {
      return { success: false, error: 'Seuls les entretiens en attente peuvent être marqués comme absents' };
    }

    // Update interview status
    interview.status = 'CANCELLED';
    await interview.save();

    // Recalculate queue positions for the company
    await assignQueuePositions(interview.company);

    return { success: true };
  } catch (error) {
    console.error('Error marking student absent:', error);
    return { success: false, error: 'Erreur lors du marquage d\'absence' };
  }
}

export async function getNextStudent(
  companyId: string | Types.ObjectId
): Promise<{ student: unknown | null; error?: string }> {
  try {
    await connectToDatabase();

    const companyObjectId = new Types.ObjectId(companyId);

    // Find next waiting interview with lowest position
    const nextInterview = await Interview.findOne({
      company: companyObjectId,
      status: 'WAITING',
      queuePosition: { $gt: 0 }
    })
      .populate('student')
      .sort({ queuePosition: 1 })
      .lean();

    if (!nextInterview) {
      return { student: null };
    }

    interface PopulatedInterview {
      _id: string;
      student: {
        _id: string;
        name: string;
        email: string;
        status: 'ENSA' | 'EXTERNE';
        opportunityType: string;
      };
      queuePosition: number;
      priority: number;
      createdAt: Date;
    }

    const interview = nextInterview as unknown as PopulatedInterview;

    return {
      student: {
        _id: interview._id,
        studentInfo: interview.student,
        queuePosition: interview.queuePosition,
        priority: interview.priority,
        createdAt: interview.createdAt
      }
    };
  } catch (error) {
    console.error('Error getting next student:', error);
    return { student: null, error: 'Erreur lors de la récupération du prochain étudiant' };
  }
}

export async function getRoomQueue(
  committeeId: string | Types.ObjectId
): Promise<{ room: unknown | null; error?: string }> {
  try {
    await connectToDatabase();

    const committeeObjectId = new Types.ObjectId(committeeId);

    // Find room assigned to this committee member
    const room = await Room.findOne({
      committeeMembers: committeeObjectId
    })
      .populate('company')
      .populate({
        path: 'currentInterview',
        populate: {
          path: 'student'
        }
      })
      .lean();

    if (!room) {
      return { room: null };
    }

    // Get queue for this room's company
    const queueInterviews = await Interview.find({
      company: room.company,
      status: { $in: ['WAITING', 'IN_PROGRESS'] }
    })
      .populate('student')
      .sort({ queuePosition: 1 })
      .lean();

    interface PopulatedRoom {
      _id: string;
      name: string;
      location: string;
      company?: {
        _id: string;
        name: string;
        sector: string;
      };
      currentInterview?: {
        _id: string;
        student: {
          _id: string;
          name: string;
          email: string;
          status: 'ENSA' | 'EXTERNE';
          opportunityType: string;
        };
        startedAt: Date;
      };
    }

    const roomData = room as unknown as PopulatedRoom;

    const processedQueue = queueInterviews.map((interview) => {
      const ii = interview as unknown as {
        _id: string;
        student: unknown;
        queuePosition: number;
        priority: number;
        status: string;
        createdAt: Date;
      };
      return {
        _id: ii._id,
        student: ii.student,
        queuePosition: ii.queuePosition,
        priority: ii.priority,
        status: ii.status,
        createdAt: ii.createdAt
      };
    });

    return {
      room: {
        _id: roomData._id,
        name: roomData.name,
        location: roomData.location,
        company: roomData.company,
        currentInterview: roomData.currentInterview,
        queue: processedQueue
      }
    };
  } catch (error) {
    console.error('Error getting room queue:', error);
    return { room: null, error: 'Erreur lors de la récupération de la file d\'attente' };
  }
}
