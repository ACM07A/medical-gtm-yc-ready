const OPERATOR_PAGE = /^\/(console|studio|sandbox|benchmarks|worklist|comms|distribution|plugins|vault|draft|outreach|site|outputs)(\/|$)/;
const OPERATOR_API = /^\/api\/(state|runs|studio|benchmarks|comms|agents(?:\/|$)|demo\/reset|journey\/run|markets|vault|economics)/;

export function requiresConsoleToken(pathname) {
  return OPERATOR_PAGE.test(pathname) || OPERATOR_API.test(pathname);
}
