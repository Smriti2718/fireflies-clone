"""Small NLP helpers shared by the summarizer and the Ask assistant."""
import re
from collections import Counter

STOPWORDS = set(
    """a about above after again against all also am an and any are aren't as at be because been
    before being below between both but by can can't cannot could couldn't did didn't do does doesn't
    doing don't down during each few for from further get got gonna had hadn't has hasn't have haven't
    having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm
    i've if in into is isn't it it's its itself just let let's like maybe me more most mustn't my myself
    need no nor not now of off ok okay on once only or other ought our ours ourselves out over own
    pretty really right same shan't she she'd she'll she's should shouldn't so some something such
    sure than that that's the their theirs them themselves then there there's these they they'd
    they'll they're they've think this those through to too thing things under until up us very
    want was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which
    while who who's whom why why's will with won't would wouldn't yeah yes yep you you'd you'll you're
    you've your yours yourself yourselves going go one two also actually kind lot well guess mean
    know see say said look looks good great thanks thank everyone everybody today week still back
    first next last make sounds bit already around much many way getting take give put probably
    joining join call meeting discuss discussed talk team start""".split()
)

_WORD = re.compile(r"[A-Za-z][A-Za-z\-']+")
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])")


def tokens(text: str) -> list[str]:
    return [w.lower().strip("'-") for w in _WORD.findall(text)]


def content_tokens(text: str) -> list[str]:
    return [w for w in tokens(text) if w not in STOPWORDS and len(w) > 2]


def sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENT_SPLIT.split(text) if s.strip()]


def top_keywords(texts: list[str], k: int = 8, exclude: set[str] | None = None) -> list[str]:
    """Frequency-ranked keywords with bigram promotion ('pricing page' beats 'pricing')."""
    exclude = {e.lower() for e in (exclude or set())}
    unigrams: Counter[str] = Counter()
    bigrams: Counter[str] = Counter()
    for text in texts:
        toks = tokens(text)
        content = [t for t in toks if t not in STOPWORDS and len(t) > 2 and t not in exclude]
        unigrams.update(content)
        for a, b in zip(toks, toks[1:]):
            if (a not in STOPWORDS and b not in STOPWORDS and len(a) > 2 and len(b) > 2
                    and a not in exclude and b not in exclude):
                bigrams[f"{a} {b}"] += 1

    picked: list[str] = []
    for phrase, count in bigrams.most_common(k):
        if count >= 2:
            picked.append(phrase)
    covered = {w for p in picked for w in p.split()}
    for word, _ in unigrams.most_common(k * 3):
        if len(picked) >= k:
            break
        if word not in covered:
            picked.append(word)
            covered.add(word)
    return [p.title() for p in picked[:k]]


def ms_to_clock(ms: int) -> str:
    total = max(0, ms // 1000)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"
