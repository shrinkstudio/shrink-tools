"use client";

import { useEffect, useMemo, useState } from "react";
import posthog from "posthog-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import {
  computeEstimate,
  fmtGBP,
  type EstimatorConfig,
  type Selection,
  type ServiceType,
  type EstimateResult,
  type DevSubtype,
} from "@/lib/estimator";

const CONFIG_ENDPOINT = "https://shrink-studio-api.vercel.app/api/estimator-config";
const SUBMIT_ENDPOINT = "https://shrink-studio-api.vercel.app/api/estimator-submit";

const EMPTY_SELECTION: Selection = {
  type: "discovery",
  discoveryTier: undefined,
  seats: 4,
  devSubtype: undefined,
  devItems: [],
  optTier: undefined,
  addons: [],
};

type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "error"; message: string };

export default function ProjectEstimatorPage() {
  const [config, setConfig] = useState<EstimatorConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);

  const [contact, setContact] = useState({
    name: "",
    email: "",
    company: "",
    notes: "",
  });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  // Load config once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(CONFIG_ENDPOINT);
        if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
        const data: EstimatorConfig = await res.json();
        if (!cancelled) setConfig(data);
      } catch (err) {
        console.error("[estimator] config load failed", err);
        if (!cancelled)
          setConfigError("Couldn't load the pricing data. Please refresh and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const result: EstimateResult = useMemo(() => {
    if (!config) return { mode: "enquiry" };
    return computeEstimate(config, selection);
  }, [config, selection]);

  const setType = (type: ServiceType) => {
    setSelection((s) => ({ ...s, type }));
    posthog.capture("estimator_type_changed", { type });
  };

  const toggleDevItem = (id: string, checked: boolean) => {
    setSelection((s) => ({
      ...s,
      devItems: checked ? [...s.devItems, id] : s.devItems.filter((x) => x !== id),
    }));
  };

  const toggleAddon = (id: string, checked: boolean) => {
    setSelection((s) => ({
      ...s,
      addons: checked ? [...s.addons, id] : s.addons.filter((x) => x !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name || !contact.email) {
      setSubmitState({ status: "error", message: "Name and email are required." });
      return;
    }
    setSubmitState({ status: "sending" });
    posthog.capture("estimator_submitted", {
      type: selection.type,
      mode: result.mode,
    });
    try {
      const res = await fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, selection, result }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "Submit failed");
      setSubmitState({ status: "sent" });
      setContact({ name: "", email: "", company: "", notes: "" });
    } catch (err) {
      console.error("[estimator] submit failed", err);
      setSubmitState({
        status: "error",
        message: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-16 animate-fade-in">
          <header className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-black text-ink leading-[1.1] mb-3">
              Project estimator
            </h1>
            <p className="text-lg text-ink-muted max-w-xl">
              Get a ballpark cost for your next project. Built from our real rate card — no
              fake numbers, no sales call required.
            </p>
          </header>

          {configError && (
            <Alert variant="destructive" className="mb-6">
              {configError}
            </Alert>
          )}

          {!config && !configError && (
            <p className="text-ink-muted text-sm">Loading pricing data…</p>
          )}

          {config && (
            <>
              {/* Service type */}
              <section className="mb-10">
                <h2 className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                  What do you need?
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(["discovery", "development", "optimisation"] as ServiceType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`border p-4 text-left transition-colors ${
                        selection.type === t
                          ? "border-ink bg-ink text-white"
                          : "border-border-default hover:border-ink"
                      }`}
                    >
                      <div className="font-semibold capitalize">{t}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {t === "discovery" && "Strategy, research, planning"}
                        {t === "development" && "Build a site, app, or custom dev"}
                        {t === "optimisation" && "Ongoing CRO + AEO retainer"}
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Discovery */}
              {selection.type === "discovery" && (
                <section className="mb-10">
                  <h2 className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                    Discovery format
                  </h2>
                  <div className="space-y-2">
                    {config.services.discovery.tiers.map((tier) => (
                      <label
                        key={tier.id}
                        className={`flex gap-3 border p-4 cursor-pointer transition-colors ${
                          selection.discoveryTier === tier.id
                            ? "border-ink"
                            : "border-border-default hover:border-ink/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="discovery-tier"
                          value={tier.id}
                          checked={selection.discoveryTier === tier.id}
                          onChange={() =>
                            setSelection((s) => ({ ...s, discoveryTier: tier.id }))
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-semibold">{tier.label}</div>
                          <div className="text-sm text-ink-muted mt-1">{tier.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {selection.discoveryTier === "workshop" && (
                    <div className="mt-4 flex items-center gap-3">
                      <Label htmlFor="seats">Number of attendees</Label>
                      <Input
                        id="seats"
                        type="number"
                        min={2}
                        max={10}
                        value={selection.seats}
                        onChange={(e) =>
                          setSelection((s) => ({
                            ...s,
                            seats: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-24"
                      />
                    </div>
                  )}
                </section>
              )}

              {/* Development */}
              {selection.type === "development" && (
                <section className="mb-10">
                  <h2 className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                    What are you building?
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
                    {config.services.development.subtypes.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() =>
                          setSelection((s) => ({ ...s, devSubtype: sub.id, devItems: [] }))
                        }
                        className={`border p-4 text-left transition-colors ${
                          selection.devSubtype === sub.id
                            ? "border-ink bg-ink text-white"
                            : "border-border-default hover:border-ink"
                        }`}
                      >
                        <div className="font-semibold">{sub.label}</div>
                        <div className="text-xs opacity-70 mt-1">{sub.description}</div>
                      </button>
                    ))}
                  </div>

                  {selection.devSubtype &&
                    (() => {
                      const sub = config.services.development.subtypes.find(
                        (s) => s.id === selection.devSubtype
                      ) as DevSubtype | undefined;
                      if (!sub) return null;
                      if (sub.mode === "enquiry-only") return null;
                      return (
                        <div>
                          <h3 className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                            Deliverables
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sub.items.map((item) => {
                              const checked = selection.devItems.includes(item.id);
                              return (
                                <label
                                  key={item.id}
                                  className="flex items-center gap-3 border border-border-default p-3 cursor-pointer hover:border-ink/50 transition-colors"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => toggleDevItem(item.id, v === true)}
                                  />
                                  <span className="text-sm">{item.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                </section>
              )}

              {/* Optimisation */}
              {selection.type === "optimisation" && (
                <section className="mb-10">
                  <h2 className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                    Choose a retainer tier
                  </h2>
                  <div className="space-y-2">
                    {config.services.optimisation.tiers.map((tier) => (
                      <label
                        key={tier.id}
                        className={`flex gap-3 border p-4 cursor-pointer transition-colors ${
                          selection.optTier === tier.id
                            ? "border-ink"
                            : "border-border-default hover:border-ink/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="opt-tier"
                          value={tier.id}
                          checked={selection.optTier === tier.id}
                          onChange={() =>
                            setSelection((s) => ({ ...s, optTier: tier.id }))
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="font-semibold">{tier.label}</div>
                            <div className="font-mono text-sm">{fmtGBP(tier.monthlyPrice)}/mo</div>
                          </div>
                          <div className="text-sm text-ink-muted mt-1">{tier.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {/* Add-ons */}
              {(() => {
                const applicable = config.services.addons.filter((a) =>
                  a.appliesTo.includes(selection.type)
                );
                if (!applicable.length) return null;
                return (
                  <section className="mb-10">
                    <h2 className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                      Add-ons (optional)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {applicable.map((addon) => {
                        const checked = selection.addons.includes(addon.id);
                        return (
                          <label
                            key={addon.id}
                            className="flex items-center gap-3 border border-border-default p-3 cursor-pointer hover:border-ink/50 transition-colors"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => toggleAddon(addon.id, v === true)}
                            />
                            <span className="text-sm">{addon.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })()}

              <Separator className="my-10" />

              {/* Output */}
              <Card className="p-8 mb-10">
                <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                  Estimated investment
                </div>
                {result.mode === "range" && (
                  <div className="text-4xl sm:text-5xl font-black text-ink">
                    {fmtGBP(result.low)}{" "}
                    <span className="text-ink-muted">–</span> {fmtGBP(result.high)}
                  </div>
                )}
                {result.mode === "single" && (
                  <div className="text-4xl sm:text-5xl font-black text-ink">
                    {fmtGBP(result.value)}
                    {result.recurring && (
                      <span className="text-xl text-ink-muted font-normal">/mo</span>
                    )}
                  </div>
                )}
                {result.mode === "enquiry" && (
                  <div className="text-xl text-ink-muted">
                    {selection.type === "development" && selection.devSubtype === "other"
                      ? "Bespoke dev work needs a quick scoping call — share a few details below and we'll get back to you with a proper estimate."
                      : "Choose an option above to see your ballpark."}
                  </div>
                )}
                <p className="text-xs text-ink-muted mt-4">
                  Ballpark based on our real rate card. Final scope is confirmed in a
                  discovery call.
                </p>
              </Card>

              {/* Contact form */}
              <section>
                <h2 className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                  Send me the breakdown
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        required
                        value={contact.name}
                        onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={contact.email}
                        onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={contact.company}
                      onChange={(e) => setContact((c) => ({ ...c, company: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Anything else we should know?</Label>
                    <textarea
                      id="notes"
                      rows={3}
                      className="w-full border border-border-default px-3 py-2 text-sm rounded-md"
                      value={contact.notes}
                      onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))}
                    />
                  </div>

                  {submitState.status === "error" && (
                    <Alert variant="destructive">{submitState.message}</Alert>
                  )}
                  {submitState.status === "sent" && (
                    <Alert>Thanks — we&apos;ll be in touch shortly.</Alert>
                  )}

                  <Button type="submit" disabled={submitState.status === "sending"}>
                    {submitState.status === "sending" ? "Sending…" : "Get my estimate"}
                  </Button>
                </form>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
