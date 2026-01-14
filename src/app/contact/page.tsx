"use client";

import Link from "next/link";
import { useState, useRef } from "react";

import { Footer } from "@/components/layout/Footer";

function ContactIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

const faqItems = [
  {
    question: "How do I create a private game room?",
    answer:
      "After signing in, go to the Lobby and click 'Create Room'. You'll get a unique room code that you can share with your friends to invite them to play.",
  },
  {
    question: "Is Dama King completely free to play?",
    answer:
      "Yes! Dama King is 100% free to play. You can enjoy all features including AI practice, online multiplayer, ranked matches, and private rooms without any cost.",
  },
  {
    question: "How does the ranking system work?",
    answer:
      "We use an ELO-based rating system. You start at 1200 ELO and gain or lose points based on match outcomes. Beating higher-rated players earns more points!",
  },
  {
    question: "Can I play without creating an account?",
    answer:
      "Absolutely! You can play as a guest instantly. However, creating an account lets you track your stats, maintain your rank, and customize your profile.",
  },
  {
    question: "What are the rules of Filipino Dama?",
    answer:
      "Filipino Dama uses mandatory capture, backward capture for regular pieces, and flying kings that can move multiple squares diagonally. Check our home page for a detailed rules summary!",
  },
];

const contactMethods = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    title: "Email Us",
    description: "Get a response within 24-48 hours",
    value: "neiellcare.paradiang@gmail.com",
    href: "mailto:neiellcare.paradiang@gmail.com",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    title: "GitHub",
    description: "Report bugs or request features",
    value: "github.com/koneb71/dama-king",
    href: "https://github.com/koneb71/dama-king",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          d="M7.5 21a3.5 3.5 0 0 1-3.49-3.19l-.71-7.14A2.5 2.5 0 0 1 5.77 8.2a1.4 1.4 0 1 1 2.1-1.78 8.96 8.96 0 0 1 8.26 0 1.4 1.4 0 1 1 2.09 1.78 2.5 2.5 0 0 1 2.48 2.47l-.7 7.14A3.5 3.5 0 0 1 16.5 21h-9ZM12 17.5a1.5 1.5 0 1 0-.001-3.001A1.5 1.5 0 0 0 12 17.5Z"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Buy Me a Coffee",
    description: "Support this project with a coffee!",
    value: "buymeacoffee.com/koneb",
    href: "https://buymeacoffee.com/koneb",
  },
];

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus("submitting");

    // Simulate form submission (replace with actual API call)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setFormStatus("success");
    formRef.current?.reset();

    // Reset to idle after showing success message
    setTimeout(() => setFormStatus("idle"), 5000);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-8 pt-12 sm:pb-12 sm:pt-20">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-gradient-to-br from-amber-500/10 to-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
            <ContactIcon className="h-4 w-4 text-red-500" />
            Get in Touch
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            We&apos;d Love to{" "}
            <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Hear From You
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Have questions, feedback, or just want to say hello? Drop us a message and our team will get back to you as
            soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {contactMethods.map((method, index) => (
              <a
                key={index}
                href={method.href}
                target={method.href.startsWith("http") ? "_blank" : undefined}
                rel={method.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex flex-col items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-6 text-center shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-zinc-900/80"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/25 transition-transform group-hover:scale-110">
                  {method.icon}
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-bold">{method.title}</h3>
                  <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">{method.description}</p>
                  <p className="text-sm font-medium text-red-500">{method.value}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="py-8 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-1 lg:gap-12">
            {/* FAQ Section */}
            <div className="order-1 lg:order-2">
              <h2 className="mb-6 text-2xl font-bold">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {faqItems.map((item, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white/80 shadow-md backdrop-blur-sm transition-all dark:border-white/10 dark:bg-zinc-900/80"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="font-semibold">{item.question}</span>
                      <svg
                        className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 ${
                          expandedFaq === index ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        expandedFaq === index ? "max-h-48" : "max-h-0"
                      }`}
                    >
                      <p className="border-t border-zinc-100 px-5 py-4 text-sm text-zinc-600 dark:border-white/5 dark:text-zinc-400">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Help Card */}
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 dark:from-amber-900/20 dark:to-orange-900/20">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg">
                    💡
                  </div>
                  <div>
                    <h3 className="mb-1 font-bold">Need Quick Help?</h3>
                    <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                      Check out our home page for detailed game rules and tips to get started!
                    </p>
                    <Link
                      href="/#how-to-play"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                    >
                      View Game Rules
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section className="py-8 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-800 to-zinc-900 p-8 text-center text-white shadow-2xl dark:from-zinc-900 dark:to-black sm:p-12">
            {/* Decorative elements */}
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-red-500/20 blur-2xl" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-orange-500/20 blur-2xl" />

            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Community Growing
              </div>

              <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Join Our Growing Community</h2>
              <p className="mx-auto mb-8 max-w-xl text-zinc-300">
                Connect with fellow Dama enthusiasts, share strategies, and stay updated on new features and
                tournaments.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/lobby"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Join the Lobby
                </Link>
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  View Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
