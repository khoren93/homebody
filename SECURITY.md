# Security policy

## Supported versions

Homebody is a static web app without a backend. Only the latest release and the `main` branch
receive fixes.

## Reporting a vulnerability

Please report security problems privately, not in a public issue:

- through GitHub's [private vulnerability reporting](https://github.com/khoren93/homebody/security/advisories/new), or
- by email to khoren.markosyan@gmail.com.

Include what you found, how to reproduce it and what an attacker could do with it. You can expect
an acknowledgement within a week. Once a fix is released, the report is credited in the changelog
unless you prefer otherwise.

## Scope

Things that are in scope:

- Cross-site scripting or injection through imported backup files or dataset content.
- Weaknesses in the Content-Security-Policy or the nginx configuration shipped in this repository.
- Anything that makes the app send user data to a third party.

Things to keep in mind:

- All data lives in the browser profile of the device. Anyone with access to the unlocked device
  or the browser profile can read it; backup files are plain JSON and are not encrypted.
- The app makes no network requests besides loading its own files.
