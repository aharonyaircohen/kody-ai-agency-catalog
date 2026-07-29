Verify the actual published documentation at the canonical location returned by
the publication step. Work read-only and invoke `documentation-reviewer`.

Confirm the published revision exists, is readable through its real surface,
matches the reviewed content, has working internal navigation and links, and
does not expose broken formatting or missing assets. Do not treat a successful
write or commit as proof of the rendered result. Return `blocked` when the real
surface cannot be reached and `fail` when it is reachable but incorrect.

Return exactly one JSON object matching the capability contract.
