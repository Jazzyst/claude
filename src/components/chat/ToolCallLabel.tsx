interface ToolCallLabelProps {
  toolName: string;
  args: Record<string, unknown>;
}

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const path = typeof args.path === "string" ? args.path : "";
  const command = typeof args.command === "string" ? args.command : "";
  const fileName = path ? getFileName(path) : "";

  if (toolName === "str_replace_editor") {
    if (!fileName) return toolName;
    switch (command) {
      case "create":
        return `Creating ${fileName}`;
      case "str_replace":
      case "insert":
        return `Editing ${fileName}`;
      case "view":
        return `Reading ${fileName}`;
      case "undo_edit":
        return `Reverting ${fileName}`;
      default:
        return toolName;
    }
  }

  if (toolName === "file_manager") {
    if (!fileName) return toolName;
    switch (command) {
      case "rename": {
        const newPath = typeof args.new_path === "string" ? args.new_path : "";
        const newFileName = newPath ? getFileName(newPath) : "";
        return newFileName
          ? `Renaming ${fileName} → ${newFileName}`
          : `Renaming ${fileName}`;
      }
      case "delete":
        return `Deleting ${fileName}`;
      default:
        return toolName;
    }
  }

  return toolName;
}

export function ToolCallLabel({ toolName, args }: ToolCallLabelProps) {
  return <span>{getLabel(toolName, args)}</span>;
}
