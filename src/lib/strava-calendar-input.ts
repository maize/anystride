import { MarketplaceError } from './marketplace-config';
import { trainingRange, trainingReference } from './training-input';
export function stravaCalendarQuery(params: URLSearchParams) {
  for (const key of params.keys()) if (!['from','to','relationship','cursor'].includes(key) || params.getAll(key).length !== 1) throw new MarketplaceError('Invalid activity calendar request.',400);
  const {from,to}=trainingRange(params.get('from'),params.get('to'));
  if (Date.parse(to)-Date.parse(from)>6*86400000) throw new MarketplaceError('Load one week of activities at a time.',400);
  const relationship=params.has('relationship') ? trainingReference(params.get('relationship')) : undefined;
  const cursor=params.get('cursor');
  if (cursor !== null && (!/^\d{1,16}$/.test(cursor) || !Number.isSafeInteger(Number(cursor)) || Number(cursor)<=0)) throw new MarketplaceError('Invalid activity page.',400);
  return {from,to,relationship,cursor:cursor ? Number(cursor) : null};
}
export function stravaMatchInput(input: unknown) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new MarketplaceError('Choose an activity and workout.',400);
  const b=input as Record<string,unknown>;
  const keys=b.action==='match' ? ['action','activityId','workoutId','workoutVersion','connection'] : ['action','activityId','matchId'];
  if (!['match','unmatch'].includes(String(b.action)) || Object.keys(b).length!==keys.length || Object.keys(b).some(k=>!keys.includes(k)) || typeof b.activityId!=='number' || !Number.isSafeInteger(b.activityId) || b.activityId<=0) throw new MarketplaceError('Invalid workout match.',400);
  if (b.action==='unmatch') return {action:'unmatch' as const,activityId:b.activityId,matchId:trainingReference(b.matchId)};
  if (typeof b.workoutVersion!=='number' || !Number.isSafeInteger(b.workoutVersion) || b.workoutVersion<1 || b.workoutVersion>1000000) throw new MarketplaceError('Reload the workout before matching.',400);
  return {action:'match' as const,activityId:b.activityId,workoutId:trainingReference(b.workoutId),workoutVersion:b.workoutVersion,connection:trainingReference(b.connection)};
}
