import { z } from 'zod';

// Zod can compile object schemas with `new Function` for speed. That needs
// `unsafe-eval` in the Content-Security-Policy, which Homebody does not allow,
// so the interpreter is used instead. This module must be imported before any
// schema is used.
z.config({ jitless: true });
