import { MarketplaceError } from './marketplace-config';
import { trainingReference } from './training-input';
export function parseStravaSharing(input: unknown) {
  const invalid = (): never => { throw new MarketplaceError('Choose a coach and a sharing setting. Refresh if this page is out of date.', 400); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const row = input as Record<string, unknown>;
  if (Object.keys(row).length !== 5 || Object.keys(row).some(k => !['id','enabled','version','relationshipVersion','connection'].includes(k)) || typeof row.enabled !== 'boolean') return invalid();
  if (!Number.isSafeInteger(row.version) || Number(row.version) < 0 || Number(row.version) > 1_000_000 || !Number.isSafeInteger(row.relationshipVersion) || Number(row.relationshipVersion) < 1) return invalid();
  return { id: trainingReference(row.id), connection: row.connection === null ? null : trainingReference(row.connection), enabled: row.enabled, version: Number(row.version), relationshipVersion: Number(row.relationshipVersion) };
}
export function stravaCoachQuery(params: URLSearchParams) {
  if ([...params.keys()].some(k => !['relationship','cursor'].includes(k)) || params.getAll('relationship').length !== 1 || params.getAll('cursor').length > 1) throw new MarketplaceError('Choose an athlete from your roster.', 400);
  const relationship = trainingReference(params.get('relationship'));
  const cursor = params.get('cursor');
  let date: string | null = null, id: number | null = null;
  if (cursor !== null) {
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\|(\d{1,16})$/.exec(cursor);
    if (!match || !Number.isFinite(Date.parse(match[1])) || !Number.isSafeInteger(Number(match[2])) || Number(match[2]) <= 0) throw new MarketplaceError('This activity page is invalid. Open the first page again.', 400);
    date = match[1]; id = Number(match[2]);
  }
  return { relationship, date, id };
}
