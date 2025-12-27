import React from "react";

/**
 * Stub provider so the app builds without LiveKit wired yet.
 * Replace with real LiveKitRoom + token minting when you’re ready.
 */
export function LiveKitJamProvider(props: { children: React.ReactNode }) {
  return <>{props.children}</>;
}
