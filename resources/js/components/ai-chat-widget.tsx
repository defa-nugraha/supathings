import { usePage } from '@inertiajs/react';
import {
    Bot,
    History,
    MessageCircle,
    Plus,
    Send,
    UserRound,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

type ChatResponse = {
    answer: string;
    evidence: string[];
    limitations: string[];
};

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    question?: string;
    response?: ChatResponse;
    pending?: boolean;
    createdAt: string;
};

type ChatHistory = {
    id: string;
    title: string;
    createdAt: string;
    messages: ChatMessage[];
};

const dateTime = (value: string) =>
    new Date(value).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

export function AiChatWidget() {
    const page = usePage();
    const userId = page.props.auth?.user?.id ?? 'guest';
    const [question, setQuestion] = useState('');
    const [chatting, setChatting] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [error, setError] = useState('');
    const chatScrollRef = useRef<HTMLDivElement | null>(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);

    const storageKey = `supathings-ai-chat-history:${userId}`;

    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setChatHistory(JSON.parse(saved) as ChatHistory[]);
            }
        } catch {
            localStorage.removeItem(storageKey);
        }
    }, [storageKey]);

    useEffect(() => {
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify(chatHistory.slice(0, 30)),
            );
        } catch {
            // Keep chat usable when browser storage is unavailable.
        }
    }, [chatHistory, storageKey]);

    const scrollChatToBottom = (behavior: ScrollBehavior = 'smooth') => {
        chatScrollRef.current?.scrollTo({
            top: chatScrollRef.current.scrollHeight,
            behavior,
        });
    };

    const handleChatScroll = () => {
        const element = chatScrollRef.current;
        if (!element) return;

        const distanceFromBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight;

        setShowScrollToBottom(distanceFromBottom > 120);
    };

    useEffect(() => {
        if (!chatOpen) {
            setShowScrollToBottom(false);
            return;
        }

        const frame = requestAnimationFrame(() => {
            scrollChatToBottom('auto');
            handleChatScroll();
        });

        return () => cancelAnimationFrame(frame);
    }, [chatOpen, activeChatId]);

    useEffect(() => {
        if (!chatOpen || !chatting) return;
        scrollChatToBottom();
    }, [chatHistory, chatOpen, chatting]);

    const startNewChat = () => {
        setActiveChatId(null);
        setQuestion('');
        setError('');
        setHistoryOpen(false);
    };

    const openChat = () => {
        setChatOpen(true);
        setHistoryOpen(false);
        setError('');
    };

    const selectChat = (item: ChatHistory) => {
        setActiveChatId(item.id);
        setQuestion('');
        setError('');
        setHistoryOpen(false);
    };

    const ask = async (event: FormEvent) => {
        event.preventDefault();

        const trimmedQuestion = question.trim();
        if (!trimmedQuestion || chatting) return;

        const messageTime = new Date().toISOString();
        const userMessage: ChatMessage = {
            id: `user-${messageTime}`,
            role: 'user',
            question: trimmedQuestion,
            createdAt: messageTime,
        };
        const pendingMessage: ChatMessage = {
            id: `assistant-${messageTime}`,
            role: 'assistant',
            pending: true,
            createdAt: messageTime,
        };

        let targetChatId = activeChatId;
        setChatting(true);
        setError('');
        setQuestion('');

        setChatHistory((current) => {
            const existing = current.find((item) => item.id === activeChatId);

            if (existing) {
                return current.map((item) =>
                    item.id === activeChatId
                        ? {
                              ...item,
                              messages: [
                                  ...item.messages,
                                  userMessage,
                                  pendingMessage,
                              ],
                          }
                        : item,
                );
            }

            const newChat: ChatHistory = {
                id: messageTime,
                title: trimmedQuestion.slice(0, 60),
                createdAt: messageTime,
                messages: [userMessage, pendingMessage],
            };

            targetChatId = newChat.id;
            setActiveChatId(newChat.id);
            return [newChat, ...current];
        });

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({ question: trimmedQuestion }),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message ?? 'AI tidak dapat menjawab.');
            }

            const responseData = payload.data as ChatResponse;

            setChatHistory((current) =>
                current.map((item) =>
                    item.id === targetChatId
                        ? {
                              ...item,
                              messages: item.messages.map((message) =>
                                  message.id === pendingMessage.id
                                      ? {
                                            ...message,
                                            pending: false,
                                            response: responseData,
                                        }
                                      : message,
                              ),
                          }
                        : item,
                ),
            );
        } catch (cause) {
            setChatHistory((current) =>
                current
                    .map((item) =>
                        item.id === targetChatId
                            ? {
                                  ...item,
                                  messages: item.messages.filter(
                                      (message) =>
                                          message.id !== pendingMessage.id,
                                  ),
                              }
                            : item,
                    )
                    .filter((item) => item.messages.length > 0),
            );
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'AI tidak dapat menjawab.',
            );
        } finally {
            setChatting(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={openChat}
                aria-label="Buka Tanya SupaThings AI"
                title="Tanya SupaThings AI"
                className="fixed right-4 bottom-36 z-[65] inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none md:right-6 md:bottom-20"
            >
                <MessageCircle
                    aria-hidden="true"
                    className="size-5 text-slate-700"
                />
                <span>Tanya AI</span>
            </button>

            {chatOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
                    <div className="flex h-[92vh] w-full max-w-5xl overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[min(760px,90vh)] sm:rounded-3xl">
                        <aside
                            className={`w-72 shrink-0 border-r bg-slate-50 ${historyOpen ? 'block' : 'hidden'} sm:block`}
                        >
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-between border-b px-4 py-4">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Riwayat chat
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Tersimpan di perangkat ini
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHistoryOpen(false)}
                                        className="rounded-lg p-2 text-slate-500 hover:bg-white sm:hidden"
                                        aria-label="Tutup riwayat chat"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                                <div className="p-3">
                                    <button
                                        type="button"
                                        onClick={startNewChat}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                        <Plus className="size-4" />
                                        Chat baru
                                    </button>
                                </div>
                                <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                                    {chatHistory.length === 0 ? (
                                        <p className="px-3 py-8 text-center text-xs leading-5 text-slate-400">
                                            Belum ada riwayat percakapan.
                                        </p>
                                    ) : (
                                        chatHistory.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => selectChat(item)}
                                                className={`w-full rounded-xl px-3 py-3 text-left transition ${item.id === activeChatId ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white'}`}
                                            >
                                                <p className="truncate text-sm font-medium text-slate-800">
                                                    {item.title}
                                                </p>
                                                <p className="mt-1 text-[11px] text-slate-400">
                                                    {dateTime(item.createdAt)}
                                                </p>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </aside>

                        <section className="flex min-w-0 flex-1 flex-col">
                            <header className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                                        <Bot className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            SupaThings AI
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Berbasis data SupaThings akun Anda
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setHistoryOpen(true)}
                                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:hidden"
                                        aria-label="Riwayat chat"
                                    >
                                        <History className="size-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={startNewChat}
                                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                        aria-label="Chat baru"
                                    >
                                        <Plus className="size-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setChatOpen(false)}
                                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                        aria-label="Tutup chat"
                                    >
                                        <X className="size-5" />
                                    </button>
                                </div>
                            </header>

                            <div
                                ref={chatScrollRef}
                                onScroll={handleChatScroll}
                                className="relative flex-1 overflow-y-auto bg-white px-4 py-5 sm:px-6"
                            >
                                {activeChatId &&
                                chatHistory.find(
                                    (item) => item.id === activeChatId,
                                )?.messages.length ? (
                                    <div className="mx-auto max-w-3xl space-y-5">
                                        {chatHistory
                                            .find(
                                                (item) =>
                                                    item.id === activeChatId,
                                            )
                                            ?.messages.map((message) =>
                                                message.role === 'user' ? (
                                                    <div
                                                        key={message.id}
                                                        className="flex justify-end gap-2"
                                                    >
                                                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white">
                                                            {message.question}
                                                        </div>
                                                        <UserRound className="mt-2 size-4 shrink-0 text-slate-400" />
                                                    </div>
                                                ) : (
                                                    <div
                                                        key={message.id}
                                                        className="flex gap-3"
                                                    >
                                                        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                                            <Bot className="size-4 text-slate-600" />
                                                        </div>
                                                        <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
                                                            {message.pending ? (
                                                                <div
                                                                    className="flex items-center gap-1.5 py-1"
                                                                    role="status"
                                                                    aria-label="SupaThings AI sedang menjawab"
                                                                >
                                                                    <span className="text-xs text-slate-500">
                                                                        SupaThings
                                                                        AI
                                                                        sedang
                                                                        menjawab
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        [
                                                                            0,
                                                                            140,
                                                                            280,
                                                                        ].map(
                                                                            (
                                                                                delay,
                                                                            ) => (
                                                                                <span
                                                                                    key={
                                                                                        delay
                                                                                    }
                                                                                    className="size-1.5 animate-bounce rounded-full bg-slate-500"
                                                                                    style={{
                                                                                        animationDelay: `${delay}ms`,
                                                                                    }}
                                                                                />
                                                                            ),
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <p className="whitespace-pre-wrap">
                                                                        {
                                                                            message
                                                                                .response
                                                                                ?.answer
                                                                        }
                                                                    </p>
                                                                    {message
                                                                        .response
                                                                        ?.evidence
                                                                        .length ? (
                                                                        <div className="mt-3 border-t border-slate-200 pt-3">
                                                                            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                                                Bukti
                                                                                data
                                                                            </p>
                                                                            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-600">
                                                                                {message.response.evidence.map(
                                                                                    (
                                                                                        item,
                                                                                    ) => (
                                                                                        <li
                                                                                            key={
                                                                                                item
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                item
                                                                                            }
                                                                                        </li>
                                                                                    ),
                                                                                )}
                                                                            </ul>
                                                                        </div>
                                                                    ) : null}
                                                                    {message
                                                                        .response
                                                                        ?.limitations
                                                                        .length ? (
                                                                        <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                                                                            {message.response.limitations.join(
                                                                                ' ',
                                                                            )}
                                                                        </p>
                                                                    ) : null}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                    </div>
                                ) : (
                                    <div className="mx-auto flex h-full max-w-2xl items-center justify-center text-center">
                                        <div>
                                            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100">
                                                <MessageCircle className="size-7 text-slate-700" />
                                            </div>
                                            <p className="mt-4 text-sm font-semibold text-slate-900">
                                                Apa yang ingin Anda ketahui?
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Tanyakan kondisi lingkungan,
                                                perangkat, budidaya, atau biaya
                                                berdasarkan data SupaThings.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {showScrollToBottom ? (
                                    <button
                                        type="button"
                                        onClick={() => scrollChatToBottom()}
                                        className="sticky bottom-2 left-1/2 z-10 mx-auto mt-3 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50"
                                        aria-label="Kembali ke pesan terbaru"
                                    >
                                        <span className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-white">
                                            ↓
                                        </span>
                                        Pesan terbaru
                                    </button>
                                ) : null}
                            </div>

                            <form
                                onSubmit={ask}
                                className="border-t bg-white p-3 sm:p-4"
                            >
                                <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-slate-400 focus-within:bg-white">
                                    <textarea
                                        value={question}
                                        onChange={(event) =>
                                            setQuestion(event.target.value)
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === 'Enter' &&
                                                !event.shiftKey
                                            ) {
                                                event.preventDefault();
                                                event.currentTarget.form?.requestSubmit();
                                            }
                                        }}
                                        placeholder="Tanyakan sesuatu tentang SupaThings..."
                                        className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                                        maxLength={2000}
                                        rows={1}
                                    />
                                    <button
                                        type="submit"
                                        disabled={chatting || !question.trim()}
                                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Kirim pertanyaan"
                                    >
                                        <Send className="size-4" />
                                    </button>
                                </div>
                                <p className="mx-auto mt-2 max-w-3xl px-2 text-[11px] text-slate-400">
                                    AI hanya menggunakan data SupaThings akun
                                    ini. Enter untuk kirim · Shift+Enter untuk
                                    baris baru.
                                </p>
                                {error ? (
                                    <p
                                        role="alert"
                                        className="mx-auto mt-2 max-w-3xl px-2 text-xs text-red-600"
                                    >
                                        {error}
                                    </p>
                                ) : null}
                            </form>
                        </section>
                    </div>
                </div>
            )}
        </>
    );
}
