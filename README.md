# talkback

A Claude Code plugin that reads Claude's replies aloud, in a natural voice, using the
Gemini Live API. Pair it with Claude Code's built-in `/voice` dictation and you can
work hands-free: speak your prompt, listen to the answer.

- Short replies (400 characters or fewer) are read word for word.
- Longer replies are summarized in 1 to 3 spoken sentences.
- Choose a voice (women's and men's) and a character style (calm, cheerful, pirate...).
- No microphone and no browser: it only plays audio on your default speakers.

## Install

In a Claude Code terminal session:

```
/plugin install talkback --marketplace ujwalthote/talkback
```

Answer `y` to add the marketplace, then choose a scope. From a shell:
`claude plugin install talkback --marketplace ujwalthote/talkback`.

## Requirements

- Python 3.10 or newer, with the helper's packages: `pip install google-genai sounddevice python-dotenv`
  (also listed in `helper/requirements.txt`)
- A Gemini API key from https://aistudio.google.com (each user brings their own)
- Speakers or headphones
- For dictation: Claude Code's `/voice` (needs a claude.ai sign-in)

Tested on Windows 11. macOS and Linux are untested.

## Setup

Put your key in a file named `.claude-voice.env` in your home folder:

```
GEMINI_API_KEY=your-key-here
```

Optional lines: `VOICE=Aoede`, `LIVE_MODEL=gemini-3.8-live`, `VERBATIM_MAX=400`.
The key lives outside the plugin, so it is never part of the repository.

## Usage

Spoken replies are on by default once installed. Commands:

| Command | What it does |
| --- | --- |
| `/assistant` | Toggle spoken replies |
| `/assistant on` / `off` / `stop` | Turn on, turn off, or cut off the current speech |
| `/assistant voices` | List voices |
| `/assistant voice woman` / `man` / `<name>` | Pick a voice, for example `kore` or `puck` |
| `/assistant styles` | List character styles |
| `/assistant style <name>` | Pick a style: calm, cheerful, serious, storyteller, pirate, robot, coach |

Voice and style are remembered across sessions. Sending a new prompt cuts off speech.

## How it works

When a turn finishes, the plugin starts `helper/speak.py` and passes it Claude's final
answer. The helper opens a Gemini Live session, has it speak the text, plays the audio
and exits. Nothing runs between replies.

## Safety notes

- The text of Claude's replies is sent to Google's Gemini API to be spoken. Turn the plugin
  off (`/assistant off`) for sessions with sensitive content.
- The plugin only speaks. It never approves permission prompts or runs anything for you,
  and Claude Code's permission prompts stay as they are.
- Your API key stays in your own `~/.claude-voice.env`. Never commit it.

## License

MIT
