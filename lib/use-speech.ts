"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SpeechController {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  index: number;
  rate: number;
  play: (from?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
}

/**
 * Reads paragraphs sequentially with the Web Speech API so a session can be
 * replayed offline. TTS is browser-native: no extra cost, no audio files.
 */
export function useSpeech(paragraphs: string[]): SpeechController {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(-1);
  const [rate, setRateState] = useState(0.95);

  const paragraphsRef = useRef(paragraphs);
  const rateRef = useRef(rate);
  const canceledRef = useRef(false);

  useEffect(() => {
    paragraphsRef.current = paragraphs;
  }, [paragraphs]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
    return () => {
      canceledRef.current = true;
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  const play = useCallback((from = 0) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    canceledRef.current = false;
    synth.cancel();
    setSpeaking(true);
    setPaused(false);

    const speakAt = (position: number) => {
      if (canceledRef.current) return;
      const list = paragraphsRef.current;
      const text = list[position];
      if (position >= list.length || text === undefined) {
        setSpeaking(false);
        setPaused(false);
        setIndex(-1);
        return;
      }
      setIndex(position);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = rateRef.current;
      utterance.pitch = 0.95;
      const voices = synth.getVoices();
      const vietnamese = voices.find((voice) => voice.lang.toLowerCase().startsWith("vi"));
      if (vietnamese) utterance.voice = vietnamese;
      utterance.onend = () => {
        if (!canceledRef.current) speakAt(position + 1);
      };
      utterance.onerror = () => {
        if (!canceledRef.current) speakAt(position + 1);
      };
      synth.speak(utterance);
    };

    speakAt(Math.max(0, from));
  }, []);

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, []);

  const stop = useCallback(() => {
    canceledRef.current = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setPaused(false);
    setIndex(-1);
  }, []);

  const setRate = useCallback((value: number) => {
    setRateState(value);
  }, []);

  return { supported, speaking, paused, index, rate, play, pause, resume, stop, setRate };
}