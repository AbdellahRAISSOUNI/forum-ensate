import { connectToDatabase } from '@/lib/mongodb';
import { Interview } from '@/models/Interview';
import { Types } from 'mongoose';

export type Opportunity = 'PFA' | 'PFE' | 'EMPLOI' | 'STAGE_OBSERVATION';

export function calculatePriority(
  user: { isCommittee?: boolean; status?: 'ENSA' | 'EXTERNE' },
  opportunityType?: Opportunity
): number {
  const isCommittee = Boolean(user.isCommittee);
  const status = user.status || 'EXTERNE';
  const isPFAorPFE = opportunityType === 'PFA' || opportunityType === 'PFE';

  if (isCommittee && isPFAorPFE) return 10;
  if (isCommittee) return 9;
  if (status === 'ENSA' && isPFAorPFE) return 8;
  if (status === 'ENSA' && opportunityType === 'EMPLOI') return 6;
  if (status === 'ENSA' && opportunityType === 'STAGE_OBSERVATION') return 4;
  if (status === 'EXTERNE' && isPFAorPFE) return 7;
  if (status === 'EXTERNE' && opportunityType === 'EMPLOI') return 5;
  if (status === 'EXTERNE' && opportunityType === 'STAGE_OBSERVATION') return 3;
  return 1;
}

export async function assignQueuePositions(companyId: string | Types.ObjectId): Promise<void> {
  await connectToDatabase();

  const companyObjectId = new Types.ObjectId(companyId);

  const waitingInterviews = await Interview.find({
    company: companyObjectId,
    status: 'WAITING',
  })
    .populate('student')
    .lean();

  // Build enriched list with calculated priority (fallback to stored priority)
  const enriched = waitingInterviews.map((i) => {
    const ii = i as unknown as {
      _id: Types.ObjectId;
      student?: { isCommittee?: boolean; status?: 'ENSA' | 'EXTERNE'; opportunityType?: Opportunity };
      priority?: number;
    };
    const calc = calculatePriority(
      { isCommittee: ii.student?.isCommittee, status: ii.student?.status },
      ii.student?.opportunityType
    );
    return {
      _id: ii._id as Types.ObjectId,
      studentStatus: ii.student?.status as 'ENSA' | 'EXTERNE' | undefined,
      isCommittee: Boolean(ii.student?.isCommittee),
      priority: ii.priority ?? calc,
    };
  });

  // Alternating pattern buckets
  const committee: typeof enriched = [];
  const externe: typeof enriched = [];
  const ensa: typeof enriched = [];

  // Sort by priority high->low first
  enriched.sort((a, b) => b.priority - a.priority);

  // Bucketize by status
  for (const item of enriched) {
    if (item.isCommittee) committee.push(item);
    else if (item.studentStatus === 'EXTERNE') externe.push(item);
    else ensa.push(item);
  }

  const resultOrder: Types.ObjectId[] = [];
  const take = (arr: typeof enriched, n: number) => {
    for (let k = 0; k < n && arr.length > 0; k++) {
      const x = arr.shift();
      if (x) resultOrder.push(x._id);
    }
  };

  // Apply alternating pattern: 3 committee, 2 externe, 2 ENSA repeatedly
  while (committee.length || externe.length || ensa.length) {
    take(committee, 3);
    take(externe, 2);
    take(ensa, 2);
    // If some buckets still have items while others are empty, continue cycling
    if (!committee.length && !externe.length && !ensa.length) break;
  }

  // Assign sequential positions based on resultOrder
  let position = 1;
  for (const id of resultOrder) {
    await Interview.updateOne(
      { _id: id },
      { $set: { queuePosition: position } }
    );
    position += 1;
  }
}

export async function checkConflicts(
  studentId: string | Types.ObjectId,
  newCompanyId: string | Types.ObjectId
): Promise<null | { type: 'IN_PROGRESS' | 'OVERLAP'; details: string } > {
  await connectToDatabase();

  const sId = new Types.ObjectId(studentId);

  // If student has an in-progress interview, it's a conflict
  const inProgress = await Interview.findOne({ student: sId, status: 'IN_PROGRESS' });
  if (inProgress) {
    return { type: 'IN_PROGRESS', details: 'Student currently in an interview' };
  }

  // Overlap check: if there is a scheduledTime for either existing waiting item or the new company that conflicts
  // Simplified: if student already has a WAITING interview for another company at same scheduledTime
  const waiting = await Interview.find({ student: sId, status: 'WAITING' }).lean();
  // const waitingTimes = new Set(waiting.map(w => (w.scheduledTime ? new Date(w.scheduledTime).getTime() : 0)).filter(Boolean));

  // In real system, we would determine the scheduledTime for the new company; here we just check if student already queued for same company
  const alreadyQueuedSameCompany = await Interview.findOne({ student: sId, company: newCompanyId, status: { $in: ['WAITING','IN_PROGRESS'] } });
  if (alreadyQueuedSameCompany) {
    return { type: 'OVERLAP', details: 'Already queued for this company' };
  }

  // No detected conflict
  return null;
}


