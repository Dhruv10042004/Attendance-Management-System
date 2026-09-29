import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Wrench,
  AlertTriangle,
} from 'lucide-react';

import api from '../lib/api';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const errorText = (e) =>
  e?.response?.data?.message ||
  e?.message ||
  'Could not reach the server. Please try again.';

const label = (k) =>
  k
    .replace(/Pct$/, ' %')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase());

const cell = (k, v) => {
  if (v === null || v === undefined) {
    return '—';
  }

  if (typeof v === 'number' && /Pct$/.test(k)) {
    return `${v}%`;
  }

  return String(v);
};

/**
 * Renders one tool result:
 * - scalar fields as text
 * - array data as a table
 */
function DataBlock({ tool, result }) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const rows = Array.isArray(result)
    ? result
    : Object.values(result).find(Array.isArray) || [];

  const scalars = Array.isArray(result)
    ? []
    : Object.entries(result).filter(
        ([, value]) => typeof value !== 'object' || value === null
      );

  const cols = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="mt-3 rounded-md border dark:border-gray-700 p-2 text-xs">
      <div className="mb-1 font-semibold text-gray-500 dark:text-gray-400">
        From database · {tool}
      </div>

      {scalars.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
          {scalars.map(([k, v]) => (
            <span key={k}>
              <b>{label(k)}:</b> {cell(k, v)}
            </span>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c) => (
                  <TableHead key={c}>{label(c)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {cols.map((c) => (
                    <TableCell key={c}>
                      {cell(c, row[c])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard statistics.
 */
function InsightStats({ departments }) {
  if (!Array.isArray(departments) || departments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {departments.map((d) => (
        <div
          key={d.department}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border dark:border-gray-700 p-2"
        >
          {departments.length > 1 && (
            <span className="font-semibold">{d.department}</span>
          )}

          <span className="text-gray-500 dark:text-gray-400">
            Weakest subject:{' '}
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {d.lowestSubject ?? '—'}
            </span>
          </span>

          <span className="rounded bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-amber-800 dark:text-amber-300">
            {d.belowRequired} below {d.requiredPct}%
          </span>

          <span className="rounded bg-red-100 dark:bg-red-950 px-2 py-0.5 text-red-800 dark:text-red-300">
            {d.below60} below 60%
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * AI attendance insights card.
 */
export function AiInsights() {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  });

  const load = async () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      error: null,
    }));

    try {
      const response = await api.get('/ai/attendance/insights');

      setState({
        loading: false,
        data: response.data,
        error: null,
      });
    } catch (e) {
      setState({
        loading: false,
        data: null,
        error: errorText(e),
      });
    }
  };

  /*
   * IMPORTANT:
   * Do not use:
   *
   * useEffect(load, []);
   *
   * Instead, call the async function from inside
   * a normal synchronous effect.
   */
  useEffect(() => {
    let cancelled = false;

    const loadInitialInsights = async () => {
      try {
        const response = await api.get('/ai/attendance/insights');

        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          data: response.data,
          error: null,
        });
      } catch (e) {
        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          data: null,
          error: errorText(e),
        });
      }
    };

    loadInitialInsights();

    return () => {
      cancelled = true;
    };
  }, []);

  const { loading, data, error } = state;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Insights
        </CardTitle>

        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {loading && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculating…
          </div>
        )}

        {error && (
          <div className="text-red-600">
            {error}
          </div>
        )}

        {data && (
          <>
            {data.facts?.scope && (
              <div className="rounded bg-blue-50 dark:bg-blue-950 px-2 py-1 text-xs text-blue-700 dark:text-blue-300">
                Scope: {data.facts.scope}
              </div>
            )}

            <InsightStats
              departments={data.facts?.departments}
            />

            {data.narrative && (
              <p>
                <span className="mr-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800">
                  AI-generated
                </span>

                {data.narrative}
              </p>
            )}

            {data.narrativeError && (
              <p className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Summary unavailable: {data.narrativeError}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const SUGGESTIONS = [
  'Which students have attendance below 75%?',
  'Which subjects have the lowest attendance?',
  'How many students were absent today?',
  'Which students show a significant decline in attendance?',
];

export default function AiAssistant() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const bottom = useRef(null);

  /*
   * IMPORTANT:
   * This effect MUST use braces.
   *
   * Do NOT write:
   *
   * useEffect(
   *   () => bottom.current?.scrollIntoView(...),
   *   [...]
   * );
   *
   * because that implicitly returns the result of scrollIntoView().
   */
  useEffect(() => {
    const element = bottom.current;

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: 'smooth',
    });

    // No value is returned from this effect.
  }, [messages, loading]);

  const send = async (text) => {
    const question = text.trim();

    if (!question || loading) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: 'user',
        text: question,
      },
    ]);

    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post(
        '/ai/attendance/query',
        {
          question,
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: 'ai',
          ...data,
        },
      ]);
    } catch (e) {
      setMessages((current) => [
        ...current,
        {
          role: 'error',
          text: errorText(e),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-xl font-bold">
            Attendance AI Assistant
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <AiInsights />

        <Card>
          <CardContent className="space-y-4">
            {messages.length === 0 && (
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <p>
                  Ask about attendance, leave requests or timetables.
                  Answers use live data you are allowed to see.
                </p>

                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => send(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === 'user'
                    ? 'text-right'
                    : ''
                }
              >
                <div
                  className={`inline-block max-w-full rounded-lg px-3 py-2 text-left text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.role === 'error'
                        ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {message.text || message.answer}
                  </div>

                  {message.role === 'ai' && (
                    <>
                      {message.toolsUsed?.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1 text-xs text-gray-500">
                          {message.toolsUsed.map((tool) => (
                            <span
                              key={tool}
                              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5"
                            >
                              <Wrench className="h-3 w-3" />
                              {tool}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          No database lookup was made for this answer.
                          Verify before relying on it.
                        </div>
                      )}

                      {Array.isArray(message.data) &&
                        message.data.map((item, index) => (
                          <DataBlock
                            key={index}
                            tool={item.tool}
                            result={item.result}
                          />
                        ))}
                    </>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up data and thinking…
              </div>
            )}

            <div ref={bottom} />
          </CardContent>
        </Card>
      </main>

      <footer className="sticky bottom-0 border-t bg-white dark:bg-gray-800">
        <form
          className="mx-auto flex max-w-4xl gap-2 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="Ask about attendance…"
            disabled={loading}
          />

          <Button
            type="submit"
            disabled={loading || !input.trim()}
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </form>
      </footer>
    </div>
  );
}