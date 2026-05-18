import { describe, expect, test } from "bun:test";

import { bunInstallCmd, detectDangerousBackendCapabilities, PRIVILEGED_PERMISSIONS } from "./manager.service";

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(overrides)) {
    previous.set(key, process.env[key]);
    const value = overrides[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe("detectDangerousBackendCapabilities", () => {
  test("flags blocked runtime capabilities", () => {
    const code = `
      import { readFileSync } from "node:fs";
      const child = require("node:child_process");
      const db = await import("bun:sqlite");
      const value = process.env.SECRET_KEY;
      Bun.spawn(["whoami"]);
      void readFileSync;
      void child;
      void db;
      void value;
    `;

    expect(detectDangerousBackendCapabilities(code)).toEqual([
      "filesystem module access",
      "subprocess module access",
      "direct SQLite module access",
      "dangerous Bun system API usage",
      "dangerous process API usage",
    ]);
  });

  test("allows ordinary spindle backend logic", () => {
    const code = `
      spindle.onFrontendMessage((payload) => {
        spindle.frontend.postMessage({ ok: true, payload });
      });

      export async function activate() {
        const granted = await spindle.permissions.getGranted();
        return granted.length;
      }
    `;

    expect(detectDangerousBackendCapabilities(code)).toEqual([]);
  });

  test("allows inert dynamic-code words and ordinary base64 decoding", () => {
    const code = `
      const docs = "This parser uses no eval() or Function() calls.";
      const note = \`Template text mentioning eval() is still documentation.\`;
      const bytes = Buffer.from(payload, "base64");
      void docs;
      void note;
      void bytes;
    `;

    expect(detectDangerousBackendCapabilities(code)).toEqual([]);
  });

  test("still flags actual dynamic execution", () => {
    const samples = [
      `eval("1 + 1")`,
      `Function("return 1")`,
      'const value = `${eval("1 + 1")}`',
    ];

    for (const code of samples) {
      expect(detectDangerousBackendCapabilities(code)).toContain("dynamic code execution");
    }
  });

  test("flags common evasions for native backend capabilities", () => {
    const samples: Array<[string, string]> = [
      [`Bun["file"]("/etc/passwd")`, "dangerous Bun system API usage"],
      [`Bun["fil" + "e"]("/etc/passwd")`, "dangerous Bun system API usage"],
      [`Bun[\`fil\${""}e\`]("/etc/passwd")`, "dangerous Bun system API usage"],
      [`const B = Bun; B.file("/etc/passwd")`, "dangerous Bun system API usage"],
      [`const { file } = Bun; file("/etc/passwd")`, "dangerous Bun system API usage"],
      [`await import("f" + "s")`, "filesystem module access"],
      [`await import(String.fromCharCode(102, 115))`, "filesystem module access"],
      [`process["e" + "nv"].SECRET`, "dangerous process API usage"],
      [`Object.getOwnPropertyDescriptor(process, "env")?.value`, "dangerous process API usage"],
      [`\u0070rocess.env.SECRET`, "dangerous process API usage"],
      [`eval(Buffer.from("Zm9v", "base64").toString())`, "dynamic code execution"],
    ];

    for (const [code, label] of samples) {
      expect(detectDangerousBackendCapabilities(code)).toContain(label);
    }
  });
});

describe("PRIVILEGED_PERMISSIONS", () => {
  test("requires explicit approval for app manipulation", () => {
    expect(PRIVILEGED_PERMISSIONS.has("app_manipulation")).toBe(true);
  });
});

describe("bunInstallCmd", () => {
  test("disables dependency lifecycle scripts for normal installs", () => {
    withEnv(
      {
        LUMIVERSE_IS_TERMUX: undefined,
        LUMIVERSE_IS_PROOT: undefined,
      },
      () => {
        expect(bunInstallCmd()).toEqual(["bun", "install", "--ignore-scripts"]);
      }
    );
  });

  test("disables dependency lifecycle scripts for proot installs", () => {
    withEnv(
      {
        LUMIVERSE_IS_TERMUX: "true",
        LUMIVERSE_IS_PROOT: "true",
      },
      () => {
        expect(bunInstallCmd()).toEqual(["bun", "install", "--ignore-scripts", "--backend=copyfile"]);
      }
    );
  });

  test("disables dependency lifecycle scripts for native Termux installs", () => {
    withEnv(
      {
        LUMIVERSE_IS_TERMUX: "true",
        LUMIVERSE_IS_PROOT: undefined,
        LUMIVERSE_BUN_METHOD: "direct",
        LUMIVERSE_BUN_PATH: "/usr/bin/bun",
      },
      () => {
        expect(bunInstallCmd()).toEqual([
          "proot",
          "--link2symlink",
          "-0",
          "/usr/bin/bun",
          "install",
          "--ignore-scripts",
          "--backend=copyfile",
        ]);
      }
    );
  });
});
