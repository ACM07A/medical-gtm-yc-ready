const OPERATOR_PAGE = /^\/(console|studio|sandbox|journey|benchmarks|worklist|comms|distribution|plugins|vault|draft|outreach|site|outputs)(\/|$)/;
const OPERATOR_API = /^\/api\/(state|runs|studio|benchmarks|comms|agents(?:\/|$)|demo\/reset|journey\/run|markets|vault|economics)/;
const APP_PAGE = /^\/(app|demo|concierge|cases|hospital|agent|vendors?|service-requests|tasks|integrations|readiness|audit|agents|workflows)(\/|$)/;
const APP_API = /^\/api\/(cases|agent-runs|audit|integrations|approvals|tasks|vendors|service-requests|concierge)(\/|$)/;

export function requiresConsoleToken(pathname) {
  return OPERATOR_PAGE.test(pathname) || OPERATOR_API.test(pathname);
}

export function requiresAppSession(pathname) {
  return APP_PAGE.test(pathname) || APP_API.test(pathname);
}
