/**
 * ASCII Art Logos for Vibex CLI
 * 
 * This module provides ASCII art logos for the Vibex CLI in different sizes
 * to enhance the visual branding and terminal UI experience.
 */

export const smallLogo = `
██╗   ██╗██╗██████╗ ███████╗██╗  ██╗
██║   ██║██║██╔══██╗██╔════╝╚██╗██╔╝
██║   ██║██║██████╦╝█████╗   ╚███╔╝ 
╚██╗ ██╔╝██║██╔══██╗██╔══╝   ██╔██╗ 
 ╚████╔╝ ██║██████╦╝███████╗██╔╝ ██╗
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝
`;

export const standardLogo = `
██╗   ██╗██╗██████╗ ███████╗██╗  ██╗
██║   ██║██║██╔══██╗██╔════╝╚██╗██╔╝
██║   ██║██║██████╦╝█████╗   ╚███╔╝ 
╚██╗ ██╔╝██║██╔══██╗██╔══╝   ██╔██╗ 
 ╚████╔╝ ██║██████╦╝███████╗██╔╝ ██╗
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝
     AI-POWERED DEVELOPMENT FLOW
`;

export const largeLogo = `
██╗   ██╗██╗██████╗ ███████╗██╗  ██╗
██║   ██║██║██╔══██╗██╔════╝╚██╗██╔╝
██║   ██║██║██████╦╝█████╗   ╚███╔╝ 
╚██╗ ██╔╝██║██╔══██╗██╔══╝   ██╔██╗ 
 ╚████╔╝ ██║██████╦╝███████╗██╔╝ ██╗
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝
╔════════════════════════════════════╗
║ AI-POWERED DEVELOPER ORCHESTRATION ║
╚════════════════════════════════════╝
`;

export const fullLogo = `
██╗   ██╗██╗██████╗ ███████╗██╗  ██╗
██║   ██║██║██╔══██╗██╔════╝╚██╗██╔╝   ┌─────────────────────────┐
██║   ██║██║██████╦╝█████╗   ╚███╔╝    │ AI-POWERED DEVELOPMENT  │
╚██╗ ██╔╝██║██╔══██╗██╔══╝   ██╔██╗    │ WORKFLOW ORCHESTRATION  │
 ╚████╔╝ ██║██████╦╝███████╗██╔╝ ██╗   └─────────────────────────┘
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝
`;

/**
 * Get the appropriate logo based on terminal width
 */
export function getLogoForWidth(width: number): string {
  if (width < 40) {
    return smallLogo;
  } else if (width < 60) {
    return standardLogo;
  } else if (width < 80) {
    return largeLogo;
  } else {
    return fullLogo;
  }
}