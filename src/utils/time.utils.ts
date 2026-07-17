
export function expiryToSeconds(expiresIn: string | number): number {
  if (typeof expiresIn === "number") {
    return expiresIn;
  }

  const match = /^(\d+)\s*(s|m|h|d)$/.exec(expiresIn.trim());

  if (!match) {
    throw new Error(
      `Invalid expiry format: "${expiresIn}". Use formats like "15m", "1h", "7d", or a plain number of seconds.`
    );
  }

  const value = Number(match[1]);
  const unit = match[2] as "s" | "m" | "h" | "d";

  const secondsPerUnit: Record<typeof unit, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
  };

  return value * secondsPerUnit[unit];
}
