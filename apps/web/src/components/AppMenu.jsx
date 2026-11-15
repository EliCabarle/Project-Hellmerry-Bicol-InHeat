// Collapsible app menu, anchored under the top-right menu button. No scrim:
// the map stays pannable behind it. Rows are a menu pattern (active highlight
// + roving focus), rendered on a clay white card surface.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconGear,
  IconGrid,
  IconHome,
  IconMap,
  IconShield,
  IconSignOut,
  IconTrophy,
  IconUser,
} from "./Icons.jsx";

const DIVIDER = "mx-3 border-t border-clay-text-muted/20 my-1.5";

export default function AppMenu({
  open = false,
  onClose,
  user = null,
  supabase = null,
  configured = false,
  navigate = () => {},
  onSignIn = () => {},
  onSignOut = () => {},
  onOpenPrivacy = () => {},
  returnFocusTo = null,
  buttonRef = null,
}) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const previousFocus = useRef(null);
  const menuRef = useRef(null);

  // Rows are defined before moveFocus: the callback's dependency array reads
  // `rows` during render, so a later declaration would hit the temporal dead
  // zone and crash the whole tree on open.
  const rows = useMemo(
    () => [
      // Home → landing (lead ruling 2026-11-14: every user, guests included).
      // First row; the landing screen renders no NavBar, so this is the only
      // in-app way back to it.
      {
        label: "Home",
        icon: IconHome,
        major: true,
        onClick: () => navigate("landing"),
      },
      {
        label: "Map",
        icon: IconMap,
        major: true,
        onClick: () => navigate("map"),
      },
      {
        label: user ? "Manage Account" : "Sign in",
        icon: IconUser,
        onClick: user ? () => navigate("account") : onSignIn,
        disabled: !user && !configured,
        tone: user ? null : "neutral",
      },
      {
        label: "Top BECOlanos",
        icon: IconTrophy,
        onClick: () => navigate("leaderboard"),
      },
      {
        label: "Dashboard",
        icon: IconGrid,
        major: true,
        onClick: () => navigate("dashboard"),
      },
      {
        label: "Narration",
        icon: IconGrid,
        onClick: () => navigate("narration"),
      },
      ...(user
        ? [
            {
              label: "Settings",
              icon: IconGear,
              onClick: () => navigate("settings"),
            },
            { divider: true },
            {
              label: "Sign Out",
              icon: IconSignOut,
              onClick: onSignOut,
              tone: "danger",
            },
          ]
        : []),
      { divider: true },
      {
        label: "Privacy",
        icon: IconShield,
        onClick: onOpenPrivacy,
      },
    ],
    [user, navigate, onSignIn, onSignOut, configured, onOpenPrivacy],
  );

  // Arrow keys move real DOM focus (roving tabindex), not just the visual
  // highlight — screen readers announce the row that actually holds focus.
  const moveFocus = useCallback(
    (dir) => {
      const focusable = rows
        .map((row, i) => ({ row, i }))
        .filter(({ row }) => !row.divider && !row.disabled);
      if (focusable.length === 0) return;
      const at = focusable.findIndex(({ i }) => i === activeIndex);
      const next =
        focusable[(at + dir + focusable.length) % focusable.length];
      if (!next) return;
      setActiveIndex(next.i);
      menuRef.current?.querySelector(`[data-menu-index="${next.i}"]`)?.focus();
    },
    [rows, activeIndex],
  );

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    // Position the menu directly under the menu button (fixed coords).
    if (buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom, right: window.innerWidth - rect.right });
    }
    const first = menuRef.current?.querySelector(
      '[role="menuitem"]:not([disabled])',
    );
    if (first) first.focus();
    setActiveIndex(0);
    return () => {
      const el =
        (returnFocusTo && returnFocusTo.current) ?? previousFocus.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, [open, returnFocusTo, buttonRef]);

  useEffect(() => {
    if (!open) return;
    const onKeydown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        moveFocus(1);
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        moveFocus(-1);
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const row = rows[activeIndex];
        if (row && !row.divider && !row.disabled) row.onClick?.();
      }
    };
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        onClose?.();
    };
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, rows, activeIndex, moveFocus, onClose]);

  const rowClass = (tone, active) => {
    const base =
      "flex w-full cursor-pointer items-center gap-3 px-3 py-2 rounded-[14px] text-sm font-clay font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
    if (tone === "danger")
      return `${base} ${active ? "bg-clay-coral/20 text-clay-coral-shadow" : "text-clay-text-muted hover:bg-clay-bg-peach hover:text-clay-text-heading"}`;
    if (active) return `${base} bg-clay-amber text-clay-text-heading`;
    return `${base} text-clay-text-body hover:bg-clay-bg-blue-white hover:text-clay-text-heading`;
  };

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Main menu"
      className="fixed z-[800] mt-0 w-[18rem] flex flex-col rounded-[24px] border border-white/30 bg-white shadow-card text-clay-text-body font-clay"
      style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
    >
      {rows.map((row, i) => {
        if (row.divider)
          return <div key={i} className={DIVIDER} aria-hidden="true" />;
        const active = activeIndex === i;
        const Icon = row.icon;
        return (
          <button
            key={i}
            role="menuitem"
            aria-disabled={row.disabled || undefined}
            data-menu-index={i}
            onClick={(event) => {
              event.stopPropagation();
              row.onClick?.();
              onClose?.();
            }}
            onMouseMove={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(-1)}
            className={rowClass(row.tone, active)}
            disabled={row.disabled}
          >
            <Icon className="h-4 w-4 shrink-0 text-clay-text-muted" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className="block text-clay-text-body">{row.label}</span>
            </div>
            {row.major && (
              <span className="text-xs font-semibold text-clay-text-muted">→</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
