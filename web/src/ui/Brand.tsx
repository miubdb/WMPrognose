import { BRAND } from '../../../shared/brand';
/** Zweifarbiges Logo (Name steht in shared/brand.ts). */
export function Brand() { return <>{BRAND.first}<span>{BRAND.second}</span></>; }
