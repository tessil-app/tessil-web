// Access keys are for the command-line tool. The settings page exists
// before the tool does; it is linked only once there is something to pair.
export const ACCESS_KEYS_ANNOUNCED = import.meta.env.VITE_ACCESS_KEYS_ANNOUNCED === "true";

// Portals are announced on the public pages only once the paid plans can
// be bought. Until then the homepage shows its new layout without them.
export const PORTALS_ANNOUNCED = import.meta.env.VITE_PORTALS_ANNOUNCED === "true";
