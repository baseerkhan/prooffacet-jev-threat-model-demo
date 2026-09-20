import type { Provenance, ThreatPattern } from "./types.js";

export const threatCatalogVersion = "2026-09-19.1";
const retrievedAt = "2026-09-19";

const source = (id: string, label: string, url: string): Provenance => ({
  id,
  label,
  url,
  retrievedAt,
});

const stride = source(
  "microsoft-stride",
  "Microsoft Threat Modeling Tool — STRIDE model",
  "https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats",
);
const brokenAccess = source(
  "owasp-a01-2021",
  "OWASP Top 10:2021 A01 — Broken Access Control",
  "https://top10.owasp.org/2021/A01_2021-Broken_Access_Control/",
);
const injection = source(
  "owasp-a03-2021",
  "OWASP Top 10:2021 A03 — Injection",
  "https://top10.owasp.org/2021/A03_2021-Injection/",
);
const auth = source(
  "owasp-a07-2021",
  "OWASP Top 10:2021 A07 — Identification and Authentication Failures",
  "https://top10.owasp.org/2021/A07_2021-Identification_and_Authentication_Failures/",
);
const integrity = source(
  "owasp-a08-2021",
  "OWASP Top 10:2021 A08 — Software and Data Integrity Failures",
  "https://top10.owasp.org/2021/A08_2021-Software_and_Data_Integrity_Failures/",
);
const apiConsumption = source(
  "owasp-api10-2023",
  "OWASP API Security Top 10:2023 API10 — Unsafe Consumption of APIs",
  "https://owasp.org/API-Security/editions/2023/en/0xa10-unsafe-consumption-of-apis/",
);
const cwe = (number: number, title: string) =>
  source(
    `cwe-${number}`,
    `CWE-${number} — ${title}`,
    `https://cwe.mitre.org/data/definitions/${number}.html`,
  );

export const threatCatalog: ThreatPattern[] = [
  {
    id: "PF-01",
    name: "Spoofing identity",
    family: "STRIDE",
    definition: "An actor can present another actor's identity or credentials at a trust boundary.",
    indicators: ["missing identity verification", "replayable credentials", "shared session identity"],
    defaultSeverity: "high",
    source: stride,
  },
  {
    id: "PF-02",
    name: "Tampering with data or requests",
    family: "STRIDE",
    definition: "An actor can modify stored data or data in transit without detection or authorization.",
    indicators: ["writable persistence", "unsigned messages", "client-controlled identifiers"],
    defaultSeverity: "high",
    source: stride,
  },
  {
    id: "PF-03",
    name: "Repudiation",
    family: "STRIDE",
    definition: "A consequential action cannot be reliably attributed to the actor who performed it.",
    indicators: ["no actor identity in events", "mutable logs", "missing action history"],
    defaultSeverity: "medium",
    source: stride,
  },
  {
    id: "PF-04",
    name: "Information disclosure",
    family: "STRIDE",
    definition: "Information can reach an actor, component, or log that is not intended to receive it.",
    indicators: ["sensitive data crosses a boundary", "overbroad responses", "unprotected local files"],
    defaultSeverity: "high",
    source: stride,
  },
  {
    id: "PF-05",
    name: "Denial of service",
    family: "STRIDE",
    definition: "A request or workload can deny timely service to legitimate users.",
    indicators: ["unbounded work", "public expensive endpoint", "no concurrency or size limit"],
    defaultSeverity: "high",
    source: stride,
  },
  {
    id: "PF-06",
    name: "Elevation of privilege",
    family: "STRIDE",
    definition: "An actor can gain capabilities beyond the privileges intended for that actor.",
    indicators: ["privileged operation behind a weak boundary", "role checks absent", "confused deputy"],
    defaultSeverity: "critical",
    source: stride,
  },
  {
    id: "PF-07",
    name: "Missing authentication",
    family: "CWE",
    definition: "A critical function is reachable without establishing and verifying caller identity.",
    indicators: ["critical route has no authentication check", "deployment authentication is unknown"],
    defaultSeverity: "critical",
    source: cwe(306, "Missing Authentication for Critical Function"),
  },
  {
    id: "PF-08",
    name: "Broken authorization",
    family: "OWASP",
    definition: "A caller can act outside intended permissions, ownership, role, or record scope.",
    indicators: ["missing server-side authorization", "caller controls object reference", "deny-by-default absent"],
    defaultSeverity: "critical",
    source: brokenAccess,
  },
  {
    id: "PF-09",
    name: "Injection",
    family: "OWASP",
    definition: "Untrusted data can alter the syntax or behavior of a downstream interpreter.",
    indicators: ["dynamic command or query", "untrusted prompt enters a tool", "missing contextual encoding"],
    defaultSeverity: "critical",
    source: injection,
  },
  {
    id: "PF-10",
    name: "Secret exposure",
    family: "CWE",
    definition: "Credentials or credential fragments can be disclosed through UI, logs, source, or artifacts.",
    indicators: ["secret rendered in UI", "secret fragment logged", "credential accepted in browser"],
    defaultSeverity: "critical",
    source: cwe(200, "Exposure of Sensitive Information to an Unauthorized Actor"),
  },
  {
    id: "PF-11",
    name: "Unsafe file upload",
    family: "CWE",
    definition: "A file from an untrusted actor can be stored or processed without safe type, name, size, or content controls.",
    indicators: ["upload entry point", "user filename used directly", "active content accepted"],
    defaultSeverity: "high",
    source: cwe(434, "Unrestricted Upload of File with Dangerous Type"),
  },
  {
    id: "PF-12",
    name: "Improper input validation",
    family: "CWE",
    definition: "Input is not validated against the properties required for safe processing.",
    indicators: ["free-form input reaches sensitive operation", "only outer JSON shape checked", "bounds absent"],
    defaultSeverity: "high",
    source: cwe(20, "Improper Input Validation"),
  },
  {
    id: "PF-13",
    name: "Missing rate or resource limits",
    family: "CWE",
    definition: "An actor can allocate work, memory, storage, or external calls without a bounded quota or throttle.",
    indicators: ["no rate limit", "unbounded request size", "unbounded external calls"],
    defaultSeverity: "high",
    source: cwe(770, "Allocation of Resources Without Limits or Throttling"),
  },
  {
    id: "PF-14",
    name: "Insufficient security logging",
    family: "CWE",
    definition: "Security-relevant events are not recorded with enough context to detect or investigate misuse.",
    indicators: ["only generic application logs", "no actor or outcome", "no failure monitoring"],
    defaultSeverity: "medium",
    source: cwe(778, "Insufficient Logging"),
  },
  {
    id: "PF-15",
    name: "Unsafe third-party API consumption",
    family: "OWASP",
    definition: "Data or behavior from an external API is trusted more than input from an untrusted actor should be.",
    indicators: ["external response drives execution", "timeouts or schema checks absent", "sensitive data sent externally"],
    defaultSeverity: "high",
    source: apiConsumption,
  },
  {
    id: "PF-16",
    name: "Software supply-chain integrity",
    family: "OWASP",
    definition: "Dependencies, build inputs, or updates can enter the product without integrity and provenance controls.",
    indicators: ["unlocked dependencies", "unverified remote asset", "automatic untrusted update"],
    defaultSeverity: "high",
    source: integrity,
  },
  {
    id: "PF-17",
    name: "Auditability gap",
    family: "Assurance",
    definition: "A reviewer cannot reconstruct the inputs, version, decision, authority, and outcome of a consequential action.",
    indicators: ["decision inputs not versioned", "review authority absent", "event lineage missing"],
    defaultSeverity: "medium",
    source: cwe(778, "Insufficient Logging"),
  },
  {
    id: "PF-18",
    name: "Sensitive error disclosure",
    family: "CWE",
    definition: "An error response reveals implementation, data, credential, or environment details useful to an attacker.",
    indicators: ["raw exception returned", "stack trace exposed", "provider error body forwarded"],
    defaultSeverity: "medium",
    source: cwe(209, "Generation of Error Message Containing Sensitive Information"),
  },
];
