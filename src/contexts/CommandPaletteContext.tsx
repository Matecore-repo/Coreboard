import React, { createContext, useContext } from "react";

export type CommandAction = {
  id: string;
  group: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
};

export interface CommandPaletteContextValue {
  openPalette: () => void;
  closePalette: () => void;
  setActions: (actions: CommandAction[]) => void;
  clearActions: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({
  value,
  children,
}: {
  value: CommandPaletteContextValue;
  children: React.ReactNode;
}) {
  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette(optional?: boolean): CommandPaletteContextValue | null {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    if (optional) {
      return null;
    }
    throw new Error("useCommandPalette debe utilizarse dentro de CommandPaletteProvider");
  }
  return context;
}

export function useCommandPaletteActions(actions: CommandAction[], deps: React.DependencyList = []) {
  const context = useCommandPalette();
  React.useEffect(() => {
    context.setActions(actions);
    return () => {
      context.clearActions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, actions, ...deps]);
}

export default CommandPaletteContext;

