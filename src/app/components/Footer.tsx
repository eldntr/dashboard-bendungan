import React from "react";

export default function Footer() {
  const waUrl = `https://wa.me/6281361858108?text=${encodeURIComponent("i want to build something cool")}`;

  return (
    <footer className="pt-8 pb-4 text-center text-xs text-slate-400 border-t border-slate-200/80 mt-10">
      <p>
        Powered by{" "}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-700 hover:text-blue-600 transition-colors underline decoration-slate-300 hover:decoration-blue-600 underline-offset-4"
        >
          Apexia
        </a>
      </p>
    </footer>
  );
}
