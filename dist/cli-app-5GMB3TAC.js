import "./chunk-PR4QN5HX.js";

// src/ui/cli-app.tsx
import { useState, useEffect, useCallback } from "react";
import { render, Box, Text, useInput, useApp } from "ink";

// src/ui/colors.ts
var Colors = {
  // Brand colors
  Primary: "#7055FF",
  Secondary: "#9580FF",
  // UI state colors
  Success: "#3EBD93",
  Warning: "#FFC53D",
  Error: "#E53E3E",
  Info: "#63B3ED",
  // Text colors
  Text: "#F8F9FA",
  TextMuted: "#A0AEC0",
  TextDim: "#718096",
  // Background colors
  Background: "#1A202C",
  BackgroundAlt: "#2D3748",
  // Accent colors
  AccentBlue: "#4299E1",
  AccentGreen: "#48BB78",
  AccentRed: "#F56565",
  AccentYellow: "#ECC94B",
  AccentPurple: "#9F7AEA",
  AccentCyan: "#0BC5EA",
  // Special use colors
  Border: "#4A5568",
  Code: "#805AD5",
  CodeBackground: "#2D3748",
  Link: "#90CDF4",
  // Grayscale
  Black: "#000000",
  White: "#FFFFFF",
  Gray100: "#F7FAFC",
  Gray200: "#EDF2F7",
  Gray300: "#E2E8F0",
  Gray400: "#CBD5E0",
  Gray500: "#A0AEC0",
  Gray600: "#718096",
  Gray700: "#4A5568",
  Gray800: "#2D3748",
  Gray900: "#1A202C"
};
var DarkTheme = {
  // Base colors
  background: Colors.Background,
  foreground: Colors.Text,
  // Accent colors
  primary: Colors.Primary,
  secondary: Colors.Secondary,
  // Status colors
  success: Colors.Success,
  warning: Colors.Warning,
  error: Colors.Error,
  info: Colors.Info,
  // Text variations
  textMuted: Colors.TextMuted,
  textDim: Colors.TextDim,
  // Borders and separators
  border: Colors.Border,
  // Code colors
  codeBackground: Colors.CodeBackground,
  codeText: Colors.Gray100,
  // Input fields
  inputBackground: Colors.Gray800,
  inputBorder: Colors.Gray600,
  inputFocusBorder: Colors.Primary,
  inputPlaceholder: Colors.Gray500,
  // UI elements
  uiElement: Colors.Gray700,
  uiElementHover: Colors.Gray600,
  uiElementActive: Colors.Primary
};
var LightTheme = {
  // Base colors
  background: Colors.Gray100,
  foreground: Colors.Gray900,
  // Accent colors
  primary: Colors.Primary,
  secondary: Colors.Secondary,
  // Status colors
  success: Colors.Success,
  warning: Colors.Warning,
  error: Colors.Error,
  info: Colors.Info,
  // Text variations
  textMuted: Colors.Gray600,
  textDim: Colors.Gray500,
  // Borders and separators
  border: Colors.Gray400,
  // Code colors
  codeBackground: Colors.Gray200,
  codeText: Colors.Gray900,
  // Input fields
  inputBackground: Colors.White,
  inputBorder: Colors.Gray400,
  inputFocusBorder: Colors.Primary,
  inputPlaceholder: Colors.Gray500,
  // UI elements
  uiElement: Colors.Gray300,
  uiElementHover: Colors.Gray400,
  uiElementActive: Colors.Primary
};

// src/ui/cli-app.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var CLIApp = ({
  startupWarnings = [],
  theme = "dark",
  onCommand,
  onExit
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { exit } = useApp();
  useEffect(() => {
    const welcomeMessage = {
      id: "welcome",
      type: "system",
      content: `Welcome to Vibex! Type /help to see available commands.
You can ask Claude to explain code, fix issues, or perform tasks.`,
      timestamp: /* @__PURE__ */ new Date()
    };
    setMessages([welcomeMessage]);
    if (startupWarnings.length > 0) {
      const warningMessage = {
        id: "warnings",
        type: "system",
        content: `Startup warnings:
${startupWarnings.map((w) => `\u2022 ${w}`).join("\n")}`,
        timestamp: /* @__PURE__ */ new Date()
      };
      setMessages((prev) => [...prev, warningMessage]);
    }
  }, [startupWarnings]);
  useInput(useCallback((input2, key) => {
    if (key.return) {
      handleSubmit();
    } else if (key.backspace) {
      setInput((prev) => prev.slice(0, -1));
    } else if (key.ctrl && input2 === "c") {
      if (onExit) {
        onExit();
      } else {
        exit();
      }
    } else if (input2 && !key.ctrl && !key.meta) {
      setInput((prev) => prev + input2);
    }
  }, [input, onExit, exit]));
  const handleSubmit = async () => {
    if (!input.trim()) return;
    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: /* @__PURE__ */ new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    const command = input.trim();
    setInput("");
    if (["exit", "quit", "/exit", "/quit"].includes(command.toLowerCase())) {
      if (onExit) {
        onExit();
      } else {
        exit();
      }
      return;
    }
    setIsProcessing(true);
    try {
      if (onCommand) {
        await onCommand(command);
      } else {
        if (command.startsWith("/")) {
          const responseMessage = {
            id: (Date.now() + 1).toString(),
            type: "system",
            content: `Command "${command}" executed.`,
            timestamp: /* @__PURE__ */ new Date()
          };
          setMessages((prev) => [...prev, responseMessage]);
        } else {
          const responseMessage = {
            id: (Date.now() + 1).toString(),
            type: "assistant",
            content: `I received your message: "${command}". AI functionality will be available once authentication is set up.`,
            timestamp: /* @__PURE__ */ new Date()
          };
          setMessages((prev) => [...prev, responseMessage]);
        }
      }
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: "error",
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: /* @__PURE__ */ new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };
  const getMessageColor = (type) => {
    switch (type) {
      case "user":
        return Colors.Primary;
      case "assistant":
        return Colors.Secondary;
      case "system":
        return Colors.Info;
      case "error":
        return Colors.Error;
      default:
        return Colors.Text;
    }
  };
  const getMessagePrefix = (type) => {
    switch (type) {
      case "user":
        return "You";
      case "assistant":
        return "Claude";
      case "system":
        return "System";
      case "error":
        return "Error";
      default:
        return "";
    }
  };
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", height: "100%", children: [
    /* @__PURE__ */ jsx(Box, { borderStyle: "round", borderColor: Colors.Primary, paddingX: 1, marginBottom: 1, children: /* @__PURE__ */ jsx(Text, { color: Colors.Primary, bold: true, children: "\u{1F680} Vibex - AI-Powered Development Assistant" }) }),
    /* @__PURE__ */ jsxs(Box, { flexDirection: "column", flexGrow: 1, paddingX: 1, children: [
      messages.map((message) => /* @__PURE__ */ jsxs(Box, { marginBottom: 1, flexDirection: "column", children: [
        /* @__PURE__ */ jsxs(Box, { children: [
          /* @__PURE__ */ jsx(Text, { color: getMessageColor(message.type), bold: true, children: getMessagePrefix(message.type) }),
          /* @__PURE__ */ jsxs(Text, { color: Colors.TextDim, children: [
            " ",
            "(",
            message.timestamp.toLocaleTimeString(),
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsx(Box, { paddingLeft: 2, children: /* @__PURE__ */ jsx(Text, { color: message.type === "error" ? Colors.Error : Colors.Text, children: message.content }) })
      ] }, message.id)),
      isProcessing && /* @__PURE__ */ jsx(Box, { marginBottom: 1, children: /* @__PURE__ */ jsx(Text, { color: Colors.TextDim, children: "Processing..." }) })
    ] }),
    /* @__PURE__ */ jsxs(Box, { borderStyle: "round", borderColor: Colors.Secondary, paddingX: 1, children: [
      /* @__PURE__ */ jsx(Text, { color: Colors.Secondary, children: "\u276F " }),
      /* @__PURE__ */ jsx(Text, { color: Colors.Text, children: input }),
      /* @__PURE__ */ jsx(Text, { color: Colors.TextDim, children: "_" })
    ] }),
    /* @__PURE__ */ jsx(Box, { paddingX: 1, paddingY: 0, children: /* @__PURE__ */ jsx(Text, { color: Colors.TextDim, children: "Type your message and press Enter. Use Ctrl+C to exit." }) })
  ] });
};
function startUI(options) {
  return render(
    /* @__PURE__ */ jsx(
      CLIApp,
      {
        startupWarnings: options.startupWarnings,
        theme: options.theme,
        onCommand: options.onCommand,
        onExit: options.onExit
      }
    )
  );
}
export {
  CLIApp,
  startUI
};
//# sourceMappingURL=cli-app-5GMB3TAC.js.map