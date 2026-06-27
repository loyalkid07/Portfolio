// ── Availability status ───────────────────────────────────────────
// Change this value to update the nav indicator everywhere.
// 'open'      → green pulse dot + "OPEN"
// 'busy'      → amber static dot + "BUILDING"
const AVAILABILITY_STATUS = 'open';

(function applyStatus() {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-label');
    if (!dot || !label) return;
    if (AVAILABILITY_STATUS === 'open') {
        dot.className = 'status-dot open';
        label.textContent = 'OPEN';
    } else {
        dot.className = 'status-dot busy';
        label.textContent = 'BUILDING';
    }
})();

// ── Theme ─────────────────────────────────────────────────────────
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
(function() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
})();

// ── Content data ──────────────────────────────────────────────────
const content = {
    'diff-whisperer': {
        type: 'project', meta: 'PROJECT_BREAKDOWN',
        cat: '', title: 'Diff-Whisperer',
        s1Label: '01 / THE_ARCHITECTURE',
        s1Body: 'Diff-Whisperer is an MCP server built to give AI coding agents (like Claude Code or Cursor) direct, pluggable access to production-like logs when things go wrong. It reads raw logs from Docker, Kubernetes, and local files (Layers 1-3), passing them through a Synthesizer that collapses IPs, UUIDs, and hashes into normalized event signatures. The core value lies in Layer 4 (The Diff Engine): whether debugging an active outage or conducting automated regression tests after pushing a fix, an agent can instantly diff \'before\' and \'after\' log windows to mathematically surface new failure modes or frequency anomalies.',
        mermaid: `flowchart TB
    classDef core fill:#ff5c00,stroke:#fff,stroke-width:2px,color:#fff;
    classDef target fill:#2A2A2A,stroke:#ff5c00,stroke-width:1px,color:#fff;
    classDef external fill:#1A1A1A,stroke:#555,stroke-width:1px,color:#ccc,stroke-dasharray: 5 5;

    Client([AI Coding Agent via MCP]) --> |JSON-RPC| Server(Diff-Whisperer Server)

    subgraph Strict Execution Boundary
        direction TB
        Server --> |resolve_within_workspace| L3[Layer 3: Local Files]
        Server --> |create_subprocess_exec| L1[Layer 1: docker logs]
        Server --> |create_subprocess_exec| L2[Layer 2: kubectl logs]
        
        L1 --> Synth
        L2 --> Synth
        L3 --> Synth
        
        Synth[Synthesizer / Normalizer] --> |Event Signatures| DiffEngine[Layer 4: Diff Engine]
        DiffEngine --> |Frequency Regressions| Server
    end

    L1 -.-> DockerDaemon(Docker Daemon)
    L2 -.-> K8sCluster(Kubernetes Cluster)
    L3 -.-> Disk[(Local File System)]

    class Synth,DiffEngine core;
    class L1,L2,L3 target;
    class DockerDaemon,K8sCluster,Disk external;`,
        code: `def diff_signatures(before: dict, after: dict, before_s: float, after_s: float):
    """
    Compute new, vanished, and frequency-shifted signatures between two windows.
    
    When an AI agent compares a 1-hour pre-deployment window to a 10-minute post-deployment 
    window, relying on raw error counts is useless. The engine calculates statistically sound 
    per-minute rates for every normalized signature, clamping zero-division edge cases, and 
    completely eliminating duration mismatches. This transforms a basic log reader into a 
    deterministic, production-grade evaluation tool.
    """
    new = [s for k, s in after.items() if k not in before]
    vanished = [s for k, s in before.items() if k not in after]
    shifted = []

    for k in before.keys() & after.keys():
        b, a = before[k], after[k]
        if max(b.count, a.count) < SHIFT_MIN_COUNT:
            continue # Too few events to distinguish a rate change from Poisson noise
            
        b_rate = b.count / (before_s / 60)   # events per minute
        a_rate = a.count / (after_s / 60)
        
        ratio = a_rate / max(b_rate, 1e-9)
        if ratio >= SHIFT_RATIO_THRESHOLD or ratio <= 1 / SHIFT_RATIO_THRESHOLD:
            shifted.append((b, a, ratio))

    return DiffResult(new=new, vanished=vanished, shifted=shifted)`,
        s2Label: '02 / THE_DESIGN_DECISIONS',
        s2Body: 'The architecture is engineered around strict boundaries and zero-trust execution. The server enforces a read-only security posture with absolutely no mutating operations allowed. All underlying system calls are strictly bounded using run_in_executor to prevent blocking the async event loop, while subprocess invocations are built exclusively with create_subprocess_exec to neutralize shell injection. To prevent agents from drowning in log spam or false positives due to time-window duration mismatches, the Diff Engine mathematically normalizes event rates, and truncates results to a strict maximum per bucket.',
        s3Label: null, s3Body: null,
        tags: ['MCP', 'Docker', 'K8s', 'AsyncIO', 'Python'],
        year: '2026', extra: 'STATUS: WORK IN PROGRESS'
    },
    'agentvault': {
        type: 'project', meta: 'PROJECT_BREAKDOWN',
        cat: '', title: 'AgentVault',
        s1Label: '01 / THE_ARCHITECTURE',
        s1Body: 'AgentVault provides the scaffolding that turns an LLM, tools, and a state store into a robust agent ecosystem. The architecture deliberately avoids graph DSLs in favor of a straightforward, async for loop. It features an automated @tool introspection engine for OpenAPI schemas and a fully dynamic ToolRegistry that handles both local Python functions and remote MCP servers simultaneously. Furthermore, the Orchestrator module enables hierarchical multi-agent setups via an agent-as-tool pattern, while the voice module exposes a stream_tokens generator that chunks LLM output into phonetically complete sentences for real-time TTS rendering.',
        mermaid: `flowchart TB
    %% Styling
    classDef core fill:#ff5c00,stroke:#fff,stroke-width:2px,color:#fff;
    classDef storage fill:#2A2A2A,stroke:#ff5c00,stroke-width:1px,color:#fff;
    classDef remote fill:#1A1A1A,stroke:#555,stroke-width:1px,color:#ccc,stroke-dasharray: 5 5;
    
    Client([Client Request]) --> |HTTP / WS| RayServe(Ray Serve Ingress)
    
    subgraph Ray Cluster [Ray Cluster / Worker Node]
        direction TB
        RayServe --> AgentActor[AgentDeployment Actor]
        AgentActor --> |Bypasses actor serialization| Loop[[_loop.py Free Function]]
        
        subgraph AgentVault Harness
            direction TB
            Loop --> |1. Reason| LLM[LiteLLM Wrapper]
            Loop --> |2. Checkpoint| State[(RedisStore)]
            Loop --> |3. Act| Registry[ToolRegistry Dispatcher]
            Loop --> |4. Observe| Verifier{Verification Hooks}
        end
        
        subgraph Concurrent Tool Dispatch
            Registry --> |asyncio.gather| Local[@tool Introspection]
            Registry --> |HTTP| MCP[MCPToolProvider]
            Registry --> |Agent-as-tool| Orchestrator[Sub-Agent Orchestrator]
        end
    end
    
    LLM --> |API| Models(OpenAI / Anthropic)
    State <--> |Persist / Dead-letter| RedisDB[(External Redis)]
    MCP -.-> |JSON-RPC| MCPServer(Remote MCP Server)
    
    class Loop core;
    class State,RedisDB storage;
    class Models,MCPServer remote;`,
        code: `from agentvault import AgentDeployment, RedisStore
from agentvault.tools import MCPToolProvider
from ray import serve

# Distributed agent deployed as a Ray Actor
class AnalystAgent(AgentDeployment):
    pass

# Binds the agent to a hot Ray Serve deployment with external state & tools
app = AnalystAgent.bind(
    name="analyst",
    model="gpt-4o",
    system_prompt="You are a senior data analyst.",
    state_store=RedisStore(url="redis://cluster:6379", ttl=3600),
    tool_providers=[MCPToolProvider("http://mcp-server:8000")],
)

serve.run(app)`,
        s2Label: '02 / THE_DESIGN_DECISIONS',
        s2Body: 'Every design decision flows from the need for horizontal scaling and reliability. By externalizing session history to Redis, agents scale across Ray clusters without sticky sessions. To prevent Ray serialization overhead from bottlenecking the cluster, the core execution loop is implemented as a free function (_loop.py), ensuring massive Agent instances and configuration closures are not serialized across the wire. Configuration is strictly immutable via frozen Pydantic models. Finally, the system guarantees observability through zero-cost OpenTelemetry span integration and machine-parseable JSON logs across every execution boundary.',
        s3Label: null, s3Body: null,
        tags: ['Ray Serve', 'Redis', 'MCP', 'OpenTelemetry', 'AsyncIO', 'LiteLLM', 'Pydantic'],
        year: '2026', extra: 'STATUS: WORK IN PROGRESS'
    },
    'mt': {
        type: 'project', meta: 'MANIFEST_FILE.004',
        cat: 'Research // MULTILINGUAL NLP · EDGE DEPLOYMENT', title: 'Culturally Aware MT Pipeline',
        s1Label: '01 / THE_PROBLEM',
        s1Body: 'Standard machine translation models fail on Indian language pairs for compounding reasons. Cultural context evaporates in direct translation: idiomatic expressions, honorifics, and social registers have no one-to-one mapping. Named entity handling breaks because models trained on Indo-European data misidentify Indian proper nouns. And morphologically rich languages like Kannada and Tamil expose tokenizer assumptions that produce subword splits that destroy semantic units. Off-the-shelf models produce grammatically valid but culturally incoherent output — correct enough to pass automated metrics, wrong enough to mislead a native speaker.',
        code: `# LoRA fine-tuning config for edge-deployable inference
lora_config = LoraConfig(
    r=16,           # Low rank — keeps parameter count small
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
)
model = get_peft_model(base_model, lora_config)

def translate_with_context(text: str, src: str, tgt: str) -> str:
    entities = ner_pipeline(text)
    sentiment = sentiment_model(text)
    cultural_ctx = adapter.extract(text, entities, sentiment)
    return model.generate(text, context=cultural_ctx, src=src, tgt=tgt)`,
        s2Label: '02 / THE_RESULTS',
        s2Body: 'LoRA fine-tuning reduced computational requirements enough to enable deployment on edge devices without meaningful quality regression compared to full fine-tuning. The NER and sentiment pipeline components preserved named entity fidelity across language pairs where off-the-shelf models failed. Evaluation used both BLEU and chrF++ — chrF++ is the more meaningful metric for morphologically rich target languages because character n-gram overlap handles inflected forms better than word-level matching. Manuscript submitted for review, 2025.',
        s3Label: null, s3Body: null,
        tags: ['IndicTrans2', 'LoRA', 'PyTorch', 'BLEU', 'chrF++', 'PEFT'],
        year: '2025', extra: 'STATUS: UNDER REVIEW'
    },
    'absa': {
        type: 'project', meta: 'PROJECT_BREAKDOWN',
        cat: '', title: 'Aspect-Based Sentiment Analysis',
        s1Label: '01 / THE_ARCHITECTURE',
        s1Body: 'The core of this project is a custom aspect-aware Attention Bi-LSTM built in PyTorch. Unlike standard sentiment classifiers that judge an entire sentence, this model extracts specific product aspects (e.g., \'battery\', \'camera\') and dynamically scores the sentiment of each one. A secondary deployed pipeline uses Stanza for dependency parsing and NLTK VADER for rule-based aspect extraction, featuring an interactive frontend powered by Streamlit.',
        mermaid: `flowchart LR
    classDef core fill:#ff5c00,stroke:#fff,stroke-width:2px,color:#fff;
    classDef target fill:#2A2A2A,stroke:#ff5c00,stroke-width:1px,color:#fff;
    
    Input(Input Sentence + Aspect) --> Tokenizer(Tokenizer & Embeddings)
    Tokenizer --> Concat[Concat: Word + Aspect Embeddings]
    Concat --> BiLSTM[Bidirectional LSTM]
    
    BiLSTM -->|Forward & Backward States| Attention[Attention Mechanism]
    
    subgraph Attention Masking
        Attention --> Mask[Context Window Mask]
        Mask --> |-1e9 Penalty| Softmax(Softmax)
    end
    
    Softmax --> ContextVector(Context Vector)
    ContextVector --> Dropout(Dropout)
    Dropout --> Dense[Dense Classifier]
    Dense --> Output([Sentiment: Pos/Neg/Neu])

    class BiLSTM,Attention,Mask core;
    class Tokenizer,Dense target;`,
        code: `def forward(self, token_embeddings, aspect_features, context_mask=None):
    # 1. Aspect-Aware Embeddings
    # We concatenate an aspect indicator vector to the token embeddings 
    # so the LSTM is inherently "aspect-aware" from the very first step.
    combined_input = torch.cat([token_embeddings, aspect_features], dim=-1)
    
    # 2. Sequence Processing (Bi-LSTM)
    # Forward pass reads before the word, backward pass reads after it.
    encoded_states, _ = self.bilstm(combined_input)
    
    # 3. Attention Scoring with Hard Masking
    # We dynamically scan the context window, applying a -1e9 penalty 
    # to out-of-bounds words before softmax to physically prevent hallucinations.
    attention_scores = self.attention(encoded_states)
    if context_mask is not None:
        attention_scores = attention_scores.masked_fill(context_mask == 0, -1e9)
        
    attention_weights = F.softmax(attention_scores, dim=1)
    
    # 4. Context Vector & Classification
    context_vector = torch.bmm(attention_weights.transpose(1, 2), encoded_states)
    logits = self.classifier(self.dropout(context_vector.squeeze(1)))
    
    return logits`,
        s2Label: '02 / THE_DESIGN_DECISIONS',
        s2Body: 'To solve the problem of overlapping sentiments (e.g., \'The camera is bad, but the battery is amazing\'), the architecture enforces two strict rules. First, the Bi-LSTM processes text bidirectionally, ensuring the representation of a word contains the full context of negations that precede it. Second, the attention mechanism uses a strict context window mask—words outside the target aspect\'s radius are mathematically penalized with a -1e9 score before the softmax layer, physically preventing the model from drawing sentiment from irrelevant clauses.',
        s3Label: null, s3Body: null,
        tags: ['PyTorch', 'Bi-LSTM', 'Attention', 'NLP', 'Streamlit'],
        year: '2024', extra: '<a href="https://github.com/loyalkid07/Aspect-Based-Sentiment-Analysis" target="_blank" rel="noopener noreferrer" class="hover:text-accent transition-colors">VIEW REPOSITORY ↗</a>',
        smallDiagram: true
    },
    'mt': {
        type: 'project', meta: 'PROJECT_BREAKDOWN',
        cat: '', title: 'Culturally Aware MT Pipeline',
        s1Label: '01 / THE_ARCHITECTURE',
        s1Body: 'Polyglot Nexus is a sophisticated real-time multilingual translation pipeline tailored for India\'s diverse linguistic landscape. Built on top of the IndicTrans2 foundation model, the system introduces a specialized context extraction layer utilizing Named Entity Recognition (NER) and Sentiment Analysis. This ensures that translations are not just grammatically correct, but culturally adapted and contextually relevant across multiple language pairs.',
        mermaid: `flowchart LR
    classDef core fill:#ff5c00,stroke:#fff,stroke-width:2px,color:#fff;
    classDef target fill:#2A2A2A,stroke:#ff5c00,stroke-width:1px,color:#fff;
    
    Input(Source Text) --> Context[Context Extraction]
    Context --> NER(NER Engine)
    Context --> Sentiment(Sentiment Analysis)
    
    NER --> Adapt[Cultural Adaptation]
    Sentiment --> Adapt
    
    Adapt --> IndicTrans[IndicTrans2 Core]
    IndicTrans --> LoRA[LoRA Edge Optimized]
    LoRA --> Output(Translated Text)

    class IndicTrans,LoRA,Adapt core;
    class NER,Sentiment target;`,
        code: `# LoRA configuration for edge-optimized inference
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForSeq2SeqLM

# Load base IndicTrans2 model
base_model = AutoModelForSeq2SeqLM.from_pretrained("ai4bharat/indictrans2-en-indic")

# Apply Low-Rank Adaptation (LoRA) for efficient edge deployment
# This targets the attention projection layers to dramatically 
# reduce the trainable parameter count.
lora_config = LoraConfig(
    r=8, 
    lora_alpha=32, 
    target_modules=["q_proj", "v_proj"], 
    lora_dropout=0.05,
    bias="none",
    task_type="SEQ_2_SEQ_LM"
)

# The resulting model drastically reduces computational overhead,
# allowing real-time inference on resource-constrained devices.
edge_optimized_model = get_peft_model(base_model, lora_config)
edge_optimized_model.eval()`,
        s2Label: '02 / EDGE_DEPLOYMENT_&_EVALUATION',
        s2Body: 'To enable deployment on resource-constrained edge devices, Low-Rank Adaptation (LoRA) was applied to the underlying model, drastically reducing computational requirements without sacrificing quality. The optimized pipeline was subjected to comprehensive evaluations, demonstrating highly competitive translation quality via standard metrics like BLEU and chrF++ across Indian language pairs.',
        s3Label: null, s3Body: null,
        tags: ['IndicTrans2', 'LoRA', 'Edge AI', 'NLP', 'PyTorch'],
        year: '2024', extra: '<a href="https://link.springer.com/chapter/10.1007/978-981-95-5835-3_5" target="_blank" rel="noopener noreferrer" class="hover:text-accent transition-colors underline underline-offset-4">VIEW PUBLICATION ↗</a>',
        smallDiagram: true
    }
};

// ── Panel Management ──────────────────────────────────────────────
function togglePanel(id) {
    const panel = document.getElementById('slide-panel');
    if (id) {
        const data = content[id];
        if (!data) return;

        document.getElementById('panel-meta-id').innerHTML =
            `<span class="inline-block w-3 h-3" style="background:var(--accent-color)"></span> ${data.meta}`;
        const catElem = document.getElementById('panel-category');
        if (data.cat) {
            catElem.textContent = data.cat;
            catElem.style.display = 'block';
        } else {
            catElem.style.display = 'none';
        }
        document.getElementById('panel-title').textContent = data.title;

        document.getElementById('panel-s1-label').innerHTML =
            `<span class="inline-block w-10 h-0.5" style="background:var(--accent-color)"></span> ${data.s1Label}`;
        document.getElementById('panel-s1-body').textContent = data.s1Body;

        const mermaidBlock = document.getElementById('panel-mermaid-block');
        if (data.mermaid && mermaidBlock) {
            const mermaidElem = document.getElementById('panel-mermaid');
            if (data.smallDiagram) {
                mermaidElem.classList.add('w-full', 'max-w-3xl', 'mx-auto');
            } else {
                mermaidElem.classList.remove('w-full', 'max-w-3xl', 'mx-auto');
            }
            mermaidElem.removeAttribute('data-processed');
            mermaidElem.textContent = data.mermaid;
            mermaidBlock.style.display = 'block';
            if (window.mermaid) {
                mermaid.run({
                    nodes: [mermaidElem]
                }).catch(e => console.error("Mermaid parsing error:", e));
            }
        } else if (mermaidBlock) {
            mermaidBlock.style.display = 'none';
        }

        const codeBlock = document.getElementById('panel-code-block');
        if (data.code) {
            const codeElem = document.getElementById('panel-code');
            codeElem.textContent = data.code;
            codeBlock.style.display = 'block';
            if (window.Prism) {
                Prism.highlightElement(codeElem);
            }
        } else {
            codeBlock.style.display = 'none';
        }

        document.getElementById('panel-s2-label').innerHTML =
            `<span class="inline-block w-10 h-0.5" style="background:var(--accent-color)"></span> ${data.s2Label}`;
        document.getElementById('panel-s2-body').textContent = data.s2Body;

        const s3Section = document.getElementById('panel-s3-section');
        if (data.s3Label) {
            document.getElementById('panel-s3-label').innerHTML =
                `<span class="inline-block w-10 h-0.5" style="background:var(--accent-color)"></span> ${data.s3Label}`;
            document.getElementById('panel-s3-body').textContent = data.s3Body;
            s3Section.classList.add('visible');
        } else {
            s3Section.classList.remove('visible');
        }

        const tagsLabel = document.getElementById('panel-tags-label');
        tagsLabel.textContent = data.type === 'blog' ? 'TOPICS' : 'TECHNOLOGIES';
        document.getElementById('panel-tags').innerHTML =
            data.tags.map(t => `<span>${t}</span>`).join('');
        document.getElementById('panel-year').textContent = data.year;

        const extraRow = document.getElementById('panel-extra-row');
        const extraLabel = document.getElementById('panel-extra-label');
        const extra = document.getElementById('panel-extra');
        if (data.extra) {
            extraLabel.textContent = data.type === 'blog' ? 'READ TIME' : 'STATUS';
            extra.innerHTML = data.extra;
            extraRow.classList.add('visible');
        } else {
            extraRow.classList.remove('visible');
        }

        panel.classList.add('active');
        panel.scrollTop = 0;
        document.body.style.overflow = 'hidden';
    } else {
        panel.classList.remove('active');
        document.body.style.overflow = '';
    }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') togglePanel(); });

// ── Mermaid Zoom ──────────────────────────────────────────────────
function openMermaidZoom() {
    const originalSvg = document.querySelector('#panel-mermaid svg');
    if (!originalSvg) return;
    
    const svgContent = originalSvg.outerHTML;
    const newWindow = window.open('', '_blank');
    
    if (!newWindow) {
        alert("Please allow popups to view the expanded diagram.");
        return;
    }
    
    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Architecture Diagram</title>
            <style>
                body { 
                    margin: 0; 
                    background: #0a0a0a; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    min-height: 100vh;
                    font-family: 'Inter', sans-serif;
                }
                svg { 
                    width: 95vw; 
                    height: 95vh;
                    max-width: none;
                }
            </style>
        </head>
        <body>
            ${svgContent}
        </body>
        </html>
    `);
    newWindow.document.close();
}

// ── Scroll Spy ────────────────────────────────────────────────────
const spySections = ['about', 'experience', 'work', 'writing'];

function updateScrollSpy() {
    const highlighter = document.getElementById('nav-highlighter');
    if (!highlighter) return;

    let activeSectionId = null;
    const scrollY = window.pageYOffset;
    const viewportMiddle = scrollY + window.innerHeight * 0.4; // 40% from top

    spySections.forEach(id => {
        const section = document.getElementById(id);
        if (!section) return;
        const top = section.offsetTop;
        const height = section.offsetHeight;
        
        if (viewportMiddle >= top && viewportMiddle <= top + height) {
            activeSectionId = id;
        }
    });

    // Fade out highlighter if at very top (Hero section)
    if (scrollY < 200) activeSectionId = null;

    document.querySelectorAll('.nav-spy-link').forEach(link => {
        if (link.dataset.section === activeSectionId) {
            link.style.color = 'var(--accent-color)'; 
            highlighter.style.opacity = '1';
            highlighter.style.transform = `translate(${link.offsetLeft}px, -50%)`;
            highlighter.style.width = link.offsetWidth + 'px';
        } else {
            link.style.color = ''; // Reset to inherit
        }
    });
    
    if (!activeSectionId) {
        highlighter.style.opacity = '0';
    }
}

// ── Writing section: adaptive grid/scroll ─────────────────────────
function initWritingSection() {
    const writingSection = document.getElementById('writing');
    if (!writingSection) return;
    const writingTrack = document.getElementById('horizontal-track-writing');
    const writingSpacer = document.getElementById('writing-spacer');
    const header = writingSection.querySelector('.section-header');
    const tiles = writingTrack ? writingTrack.querySelectorAll('.writing-tile') : [];
    const threshold = 4;

    if (tiles.length < threshold && window.innerWidth >= 768) {
        writingSection.classList.add('writing-container-grid');
        writingSection.classList.remove('horizontal-scroll-container');
        writingSpacer.classList.add('hidden');
    } else if (writingTrack && writingSpacer && header) {
        writingSection.classList.remove('writing-container-grid');
        writingSection.classList.add('horizontal-scroll-container');
        writingSpacer.classList.remove('hidden');
    }
}

// ── Horizontal scroll ─────────────────────────────────────────────
const scrollSections = [
    { containerId: '#work', trackId: '#horizontal-track-work', container: null, track: null },
    { containerId: '#writing', trackId: '#horizontal-track-writing', container: null, track: null }
];
let scrollTicking = false;

function initScrollElements() {
    scrollSections.forEach(sec => {
        sec.container = document.querySelector(sec.containerId);
        sec.track = document.querySelector(sec.trackId);
    });
}

function performHorizontalScroll() {
    const scrollY = window.pageYOffset;
    const windowHeight = window.innerHeight;

    scrollSections.forEach(sec => {
        if (!sec.container || !sec.track) return;
        if (sec.container.classList.contains('writing-container-grid')) return;

        const containerTop = sec.container.offsetTop;
        const containerHeight = sec.container.offsetHeight;
        
        // Calculate scroll percentage and clamp it between 0 and 1
        let scrollPercent = (scrollY - containerTop) / (containerHeight - windowHeight);
        if (scrollPercent < 0) scrollPercent = 0;
        if (scrollPercent > 1) scrollPercent = 1;

        const translateAmount = scrollPercent * (sec.track.scrollWidth - window.innerWidth + 64);
        sec.track.style.transform = `translateX(-${translateAmount}px)`;
    });
    
    updateScrollSpy();
    scrollTicking = false;
}

function handleHorizontalScroll() {
    if (!scrollTicking) {
        window.requestAnimationFrame(performHorizontalScroll);
        scrollTicking = true;
    }
}
window.addEventListener('scroll', handleHorizontalScroll, { passive: true });
window.addEventListener('resize', initWritingSection);

// ── Scroll reveal ─────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active'); });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Dynamic year ──────────────────────────────────────────────────
const copy = document.getElementById('footer-copyright');
if (copy) copy.textContent = `© ${new Date().getFullYear()} SHREYAS PATIL`;

// ── Mobile: disable JS horizontal scroll on touch devices ─────────────────
if (window.innerWidth < 768) {
    window.removeEventListener('scroll', handleHorizontalScroll);
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initWritingSection();
    initScrollElements();
    updateScrollSpy();
});
