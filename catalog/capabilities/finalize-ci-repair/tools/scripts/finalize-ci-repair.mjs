const input = readInput();
const prior = reportValue(input.report);
const healthy = input.status === "healthy";
const pr = positiveInteger(input.pr);
const failedChecks = stringArray(input.failedChecks);

const report = healthy
  ? {
      whatFailed: prior.whatFailed || "Repository CI was failing.",
      likelyCause:
        prior.likelyCause || "The repair addressed the supplied CI failure.",
      whatItTried:
        prior.whatItTried.length > 0
          ? prior.whatItTried
          : ["Created or updated one repair attempt", "Ran CI once"],
      whyStopped: "CI passed after one repair attempt.",
      recommendedNextAction: pr
        ? `Review and merge PR #${pr}.`
        : "Review the successful CI result.",
    }
  : {
      whatFailed:
        prior.whatFailed ||
        (failedChecks.length > 0
          ? `CI is still failing: ${failedChecks.join(", ")}.`
          : stringValue(input.summary) || "CI repair could not complete."),
      likelyCause: prior.likelyCause || "The exact cause was not proven.",
      whatItTried:
        prior.whatItTried.length > 0
          ? prior.whatItTried
          : ["Created or updated one repair attempt", "Ran CI once"],
      whyStopped:
        "CI did not pass after one repair attempt; automatic retries are disabled.",
      recommendedNextAction:
        "Review the report and repair the failure manually before rerunning CI Repair.",
    };

process.stdout.write(
  `${JSON.stringify({
    status: healthy ? "completed" : "blocked",
    summary:
      stringValue(input.summary) ||
      (healthy ? "CI repair completed." : "CI repair stopped with CI still failing."),
    report,
  })}\n`,
);

function readInput() {
  try {
    const parsed = JSON.parse(process.env.KODY_CAPABILITY_INPUT || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function reportValue(value) {
  const report = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  return {
    whatFailed: stringValue(report.whatFailed),
    likelyCause: stringValue(report.likelyCause),
    whatItTried: stringArray(report.whatItTried),
  };
}

function stringArray(value) {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : [];
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}
