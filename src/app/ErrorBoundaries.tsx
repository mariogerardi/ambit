import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { reportReactFailure } from "../services/monitoring";
import { reloadGlobeChunkOnce } from "./globeChunkRecovery";

/** A failed globe leaves the app's written controls and navigation available. */
export class BoardBoundary extends Component<
  { children: ReactNode; onError(): void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportReactFailure(error, info);
    reloadGlobeChunkOnce(error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export class PanelBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportReactFailure(error, info);
  }
  render() {
    return this.state.failed ? (
      <section className="info-view" role="alert">
        <p>Couldn’t load this screen.</p>
        <button onClick={() => location.reload()}>Reload ↻</button>
      </section>
    ) : (
      this.props.children
    );
  }
}
