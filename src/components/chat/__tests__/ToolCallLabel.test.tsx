import { test, expect, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallLabel } from "../ToolCallLabel";

afterEach(() => {
  cleanup();
});

describe("str_replace_editor", () => {
  test("create command shows Creating with filename", () => {
    render(
      <ToolCallLabel
        toolName="str_replace_editor"
        args={{ command: "create", path: "src/components/Card.jsx" }}
      />
    );
    expect(screen.getByText("Creating Card.jsx")).toBeDefined();
  });

  test("str_replace command shows Editing with filename", () => {
    render(
      <ToolCallLabel
        toolName="str_replace_editor"
        args={{ command: "str_replace", path: "src/App.jsx" }}
      />
    );
    expect(screen.getByText("Editing App.jsx")).toBeDefined();
  });

  test("insert command shows Editing with filename", () => {
    render(
      <ToolCallLabel
        toolName="str_replace_editor"
        args={{ command: "insert", path: "src/index.ts" }}
      />
    );
    expect(screen.getByText("Editing index.ts")).toBeDefined();
  });

  test("view command shows Reading with filename", () => {
    render(
      <ToolCallLabel
        toolName="str_replace_editor"
        args={{ command: "view", path: "src/lib/utils.ts" }}
      />
    );
    expect(screen.getByText("Reading utils.ts")).toBeDefined();
  });

  test("undo_edit command shows Reverting with filename", () => {
    render(
      <ToolCallLabel
        toolName="str_replace_editor"
        args={{ command: "undo_edit", path: "src/components/Button.tsx" }}
      />
    );
    expect(screen.getByText("Reverting Button.tsx")).toBeDefined();
  });

  test("path at root level (no slashes) uses full path as filename", () => {
    render(
      <ToolCallLabel
        toolName="str_replace_editor"
        args={{ command: "create", path: "App.jsx" }}
      />
    );
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
  });

  test("unknown command falls back to tool name", () => {
    render(
      <ToolCallLabel
        toolName="str_replace_editor"
        args={{ command: "unknown_op", path: "src/foo.ts" }}
      />
    );
    expect(screen.getByText("str_replace_editor")).toBeDefined();
  });

  test("empty args fallback to tool name", () => {
    render(<ToolCallLabel toolName="str_replace_editor" args={{}} />);
    expect(screen.getByText("str_replace_editor")).toBeDefined();
  });
});

describe("file_manager", () => {
  test("rename command shows Renaming with old and new filename", () => {
    render(
      <ToolCallLabel
        toolName="file_manager"
        args={{
          command: "rename",
          path: "src/components/Old.jsx",
          new_path: "src/components/New.jsx",
        }}
      />
    );
    expect(screen.getByText("Renaming Old.jsx → New.jsx")).toBeDefined();
  });

  test("rename without new_path shows just old filename", () => {
    render(
      <ToolCallLabel
        toolName="file_manager"
        args={{ command: "rename", path: "src/components/Foo.jsx" }}
      />
    );
    expect(screen.getByText("Renaming Foo.jsx")).toBeDefined();
  });

  test("delete command shows Deleting with filename", () => {
    render(
      <ToolCallLabel
        toolName="file_manager"
        args={{ command: "delete", path: "src/components/Card.jsx" }}
      />
    );
    expect(screen.getByText("Deleting Card.jsx")).toBeDefined();
  });

  test("empty args fallback to tool name", () => {
    render(<ToolCallLabel toolName="file_manager" args={{}} />);
    expect(screen.getByText("file_manager")).toBeDefined();
  });
});

describe("unknown tools", () => {
  test("renders tool name verbatim", () => {
    render(
      <ToolCallLabel toolName="some_other_tool" args={{ foo: "bar" }} />
    );
    expect(screen.getByText("some_other_tool")).toBeDefined();
  });
});
