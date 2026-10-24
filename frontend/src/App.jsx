import { useEffect, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, BookOpen, Check, ChevronDown, CircleHelp, Clock3, FileCheck2, FilePlus2, FileText, Gauge, LayoutDashboard, LoaderCircle, MessageSquareText, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { api } from './services/api'

const navItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'new', label: 'New review', icon: FilePlus2 },
  { id: 'guidelines', label: 'Brand guidelines', icon: BookOpen },
  { id: 'history', label: 'Review history', icon: Clock3 },
  { id: 'reports', label: 'Analytics', icon: Activity },
]

function App() {
  const [page, setPage] = useState('dashboard')
  const [brands, setBrands] = useState([])
  const [brandId, setBrandId] = useState('')
  const [document, setDocument] = useState(null)
  const [apiError, setApiError] = useState('')
  const [apiOnline, setApiOnline] = useState(false)
  const selectedBrand = brands.find((brand) => String(brand.id) === brandId)

  useEffect(() => {
    api.health().then(() => setApiOnline(true)).catch(() => setApiOnline(false))
    api.brands().then((items) => {
      setBrands(items)
      if (items.length) setBrandId(String(items[0].id))
    }).catch((error) => setApiError(error.message))
  }, [])

  const navigate = (nextPage) => {
    setApiError('')
    setPage(nextPage)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand-lockup" href="#overview" onClick={() => navigate('dashboard')}>
          <span className="brand-mark"><ShieldCheck size={21} strokeWidth={2.4} /></span>
          <span><strong>brandguard</strong><small>GOVERNANCE STUDIO</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <label className="brand-select-wrap" htmlFor="brand-select">
          <span className="brand-avatar">{brands.find((brand) => String(brand.id) === brandId)?.name?.slice(0, 1) || 'B'}</span>
          <select id="brand-select" value={brandId} onChange={(event) => setBrandId(event.target.value)} disabled={!brands.length}>
            {brands.length ? brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>) : <option>Loading brands</option>}
          </select>
          <ChevronDown size={14} />
        </label>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${page === id ? 'active' : ''}`} onClick={() => navigate(id)}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
              {id === 'new' && <span className="nav-shortcut">+</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className={`note-pulse ${apiOnline ? '' : 'offline'}`} />{apiOnline ? 'Analysis engine online' : 'API connection unavailable'}</div>
          <div className="profile-row"><span className="profile-avatar">M</span><span><strong>Marketing team</strong><small>Local workspace</small></span><CircleHelp size={17} /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>NovaTech workspace</span><span className="crumb-divider">/</span><strong>{navItems.find((item) => item.id === page)?.label || 'Analysis result'}</strong></div>
          <div className="topbar-right"><span className={`system-status ${apiOnline ? '' : 'offline'}`}><span className="status-dot" />{apiOnline ? 'API connected' : 'API unavailable'}</span></div>
        </header>
        {apiError && <div className="global-error" role="alert">{apiError} <span>Check that the API is running at localhost:8000.</span></div>}
        <div className="page-content" key={page}>
          {page === 'dashboard' && <Dashboard brandName={selectedBrand?.name || 'Brand'} onOpen={(id) => { api.document(id).then(setDocument).catch((error) => setApiError(error.message)); setPage('result') }} onNew={() => navigate('new')} />}
          {page === 'new' && <NewReview brandId={brandId} brandName={selectedBrand?.name || 'Brand'} onAnalyzed={(result) => { setDocument(result); setPage('result') }} />}
          {page === 'result' && document && <AnalysisResult document={document} onDocument={setDocument} onBack={() => navigate('history')} />}
          {page === 'result' && !document && <EmptyState title="No review selected" detail="Choose a review from your history or start a new one." action="Start a review" onAction={() => navigate('new')} />}
          {page === 'guidelines' && <Guidelines brandId={brandId} brandName={selectedBrand?.name || 'Brand'} brands={brands} onBrands={setBrands} onSelectBrand={setBrandId} />}
          {page === 'history' && <History onOpen={(item) => { setDocument(item); setPage('result') }} onNew={() => navigate('new')} />}
          {page === 'reports' && <Reports />}
        </div>
      </main>
    </div>
  )
}

function PageHeading({ eyebrow, title, detail, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{detail}</p></div>{action}</div>
}

function Dashboard({ brandName, onOpen, onNew }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.dashboard().then(setStats).catch((issue) => setError(issue.message)) }, [])
  return <>
    <PageHeading eyebrow={new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()} title="Good morning, team" detail={`A clear view of how your content is tracking against ${brandName} standards.`} action={<button className="button button-primary" onClick={onNew}><Plus size={17} />New content review</button>} />
    {error && <InlineError message={error} />}
    {!stats ? <Loading label="Loading workspace activity" /> : <>
      <section className="metric-grid" aria-label="Workspace metrics">
        <Metric icon={FileCheck2} label="Documents checked" value={stats.documents_checked} caption="Across all reviews" tone="blue" />
        <Metric icon={Activity} label="Brand violations" value={stats.violations_detected} caption="Rule matches found" tone="coral" />
        <Metric icon={ArrowUpRight} label="High severity" value={stats.high_severity} caption="Needs closer attention" tone="amber" />
        <Metric icon={Clock3} label="Awaiting approval" value={stats.awaiting_approval} caption="Ready for a reviewer" tone="green" />
      </section>
      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading"><div><h2>Recent reviews</h2><p>Your latest content checks</p></div><button className="text-button" disabled={!stats.recent_documents.length} onClick={() => onOpen(stats.recent_documents[0]?.id)}>View latest <ArrowUpRight size={15} /></button></div>
          {stats.recent_documents.length ? <div className="table-wrap"><table><thead><tr><th>DOCUMENT</th><th>STATUS</th><th>SCORE</th><th>SUBMITTED</th><th /></tr></thead><tbody>{stats.recent_documents.map((item) => <tr key={item.id}><td><button className="document-link" onClick={() => onOpen(item.id)}><span className="file-icon"><FileText size={17} /></span>{item.title}</button></td><td><StatusBadge status={item.status} /></td><td><span className={`score-text ${item.score < 70 ? 'score-low' : ''}`}>{item.score}<small>/100</small></span></td><td className="muted-cell">{formatDate(item.submitted_at)}</td><td><button className="row-open" aria-label={`Open ${item.title}`} onClick={() => onOpen(item.id)}>↗</button></td></tr>)}</tbody></table></div> : <EmptyInline title="No reviews yet" detail="Your submitted content will show up here." />}
        </section>
        <section className="panel category-panel">
          <div className="panel-heading"><div><h2>Violation categories</h2><p>Distribution across reviewed content</p></div><span className="small-period">ALL TIME</span></div>
          {stats.categories.length ? <CategoryBars categories={stats.categories} /> : <EmptyInline title="No findings" detail="A category breakdown appears after the first analysis." />}
          <div className="chart-footnote"><span className="chart-key" />Detected findings</div>
        </section>
      </div>
      <div className="dashboard-note"><span className="note-icon"><Gauge size={17} /></span><span><strong>Rule-based review, human-led decisions.</strong> Findings point to configured NovaTech rules; a reviewer makes the final call.</span><button onClick={() => onNew()}>Review content <ArrowUpRight size={15} /></button></div>
    </>}
  </>
}

function Metric({ icon: Icon, label, value, caption, tone }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={18} /></div><div className="metric-value">{value ?? 0}</div><div className="metric-label">{label}</div><div className="metric-caption">{caption}</div></article>
}

function CategoryBars({ categories }) {
  const max = Math.max(...categories.map((item) => item.count), 1)
  return <div className="category-list">{categories.map((item) => <div className="category-row" key={item.category}><div className="category-meta"><span>{friendlyCategory(item.category)}</span><strong>{item.count}</strong></div><div className="bar-track"><span style={{ width: `${Math.max(item.count / max * 100, 4)}%` }} /></div></div>)}</div>
}

function NewReview({ brandId, brandName, onAnalyzed }) {
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState('Website')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = title.trim() && (file || text.trim()) && brandId
  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const data = new FormData()
    data.append('brand_id', brandId)
    data.append('title', title)
    data.append('content_type', contentType)
    if (file) data.append('file', file)
    else data.append('text', text)
    try { onAnalyzed(await api.analyze(data)) } catch (issue) { setError(issue.message) } finally { setLoading(false) }
  }
  return <>
    <PageHeading eyebrow="CONTENT REVIEW" title="Check before it ships" detail="Submit a draft to find wording that needs a second look against your approved guidelines." />
    <form className="review-form-layout" onSubmit={submit}>
      <div className="form-main panel">
        <div className="form-row"><label className="field-label" htmlFor="doc-title">Document title</label><input id="doc-title" className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="e.g. Spring product launch email" required /></div>
        <div className="form-row"><label className="field-label" htmlFor="content-type">Content type</label><select id="content-type" className="text-input select-input" value={contentType} onChange={(event) => setContentType(event.target.value)}><option>Website</option><option>Email</option><option>Social media</option><option>Ad</option><option>Other</option></select></div>
        <div className="editor-heading"><label className="field-label" htmlFor="content-text">Draft content</label><span>{text.length.toLocaleString()} / 100,000</span></div>
        <textarea id="content-text" className="content-editor" value={text} onChange={(event) => { setText(event.target.value); if (file) setFile(null) }} maxLength={100000} placeholder="Paste your marketing copy here…" disabled={Boolean(file)} />
        <div className="upload-row"><span>or upload a Word document</span><label className="upload-button"><FileText size={16} />{file ? file.name : 'Choose .docx'}<input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { const selected = event.target.files?.[0]; setFile(selected || null); if (selected) setText('') }} /></label>{file && <button type="button" className="icon-button clear-file" onClick={() => setFile(null)} aria-label="Remove uploaded file"><X size={16} /></button>}</div>
        <div className="submit-row"><span><ShieldCheck size={15} /> Content is stored in your local workspace database.</span><button className="button button-primary" disabled={!canSubmit || loading}>{loading ? <><LoaderCircle className="spin" size={17} />Checking…</> : <><Activity size={17} />Run analysis</>}</button></div>
        {error && <InlineError message={error} />}
      </div>
      <aside className="review-side panel">
        <div className="side-kicker">CHECKING AGAINST</div><div className="selected-brand"><span className="brand-avatar large">{brandName.slice(0, 1)}</span><span><strong>{brandName}</strong><small>Brand profile</small></span><Check size={16} /></div>
        <div className="side-rule" />
        <div className="side-kicker">RULES INCLUDED</div>
        <ul className="rule-check-list"><li><Check size={14} />Banned language</li><li><Check size={14} />Preferred terminology</li><li><Check size={14} />Unsupported claims</li><li><Check size={14} />Approved product facts</li><li><Check size={14} />Required phrases</li></ul>
        <div className="side-callout"><CircleHelp size={16} /><span>Analysis is deterministic and rule-based. Potential fact conflicts are marked for human review.</span></div>
      </aside>
    </form>
  </>
}

function AnalysisResult({ document, onDocument, onBack }) {
  const [busyAction, setBusyAction] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const counts = ['High', 'Medium', 'Low'].map((severity) => ({ severity, count: document.findings.filter((finding) => finding.severity === severity).length }))
  async function review(action, findingId, commentText = '') {
    setBusyAction(findingId ? `${action}-${findingId}` : action)
    setError('')
    try { onDocument(await api.review(document.id, { action, finding_id: findingId, comment: commentText })) } catch (issue) { setError(issue.message) } finally { setBusyAction('') }
  }
  return <>
    <PageHeading eyebrow="ANALYSIS RESULT" title={document.title} detail={`${document.content_type} · Submitted ${formatDate(document.submitted_at)}`} action={<button className="button button-secondary" onClick={onBack}><Clock3 size={16} />Review history</button>} />
    {error && <InlineError message={error} />}
    <section className="result-summary panel">
      <div className="score-ring" style={{ '--score': `${document.compliance_score}%` }}><div><strong>{document.compliance_score}</strong><small>score</small></div></div>
      <div className="summary-copy"><div className="summary-status"><StatusBadge status={document.status} /><span>Rule-based content review</span></div><h2>{document.findings.length ? `${document.findings.length} ${document.findings.length === 1 ? 'finding' : 'findings'} need attention` : 'No configured rule matches'}</h2><p>Score starts at 100 and subtracts 20 per high, 10 per medium, and 4 per low severity finding (floored at 0). It is a workflow aid, not a legal or regulatory certification.</p></div>
      <div className="severity-breakdown">{counts.map(({ severity, count }) => <div className="severity-count" key={severity}><span className={`severity-dot ${severity.toLowerCase()}`} />{severity}<strong>{count}</strong></div>)}</div>
    </section>
    <div className="result-columns">
      <section className="panel original-panel"><div className="panel-heading"><div><h2>Submitted content</h2><p>Matched text is highlighted below</p></div><span className="small-period">ORIGINAL</span></div><HighlightedText text={document.original_content} findings={document.findings} /></section>
      <section className="findings-column"><div className="findings-heading"><div><h2>Findings</h2><p>Each match links to a configured rule</p></div><span className="finding-count">{document.findings.length}</span></div>
        {document.findings.length ? document.findings.map((finding) => <FindingCard key={finding.id} finding={finding} busyAction={busyAction} onReview={review} />) : <div className="panel no-findings"><span className="success-medallion"><Check size={22} /></span><h3>Nothing flagged by configured rules</h3><p>This is not a guarantee that content is error-free. Keep human review in the publishing process.</p></div>}
      </section>
    </div>
    <section className="panel reviewer-panel"><div className="reviewer-title"><span className="reviewer-icon"><MessageSquareText size={17} /></span><div><h2>Reviewer decision</h2><p>Record a note or update the document status.</p></div></div><div className="comment-input-row"><input className="text-input" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a reviewer comment…" aria-label="Reviewer comment" /><button className="button button-secondary" disabled={!comment.trim() || Boolean(busyAction)} onClick={() => review('COMMENT', null, comment).then(() => setComment(''))}>Add comment</button></div><div className="decision-row"><div className="comment-history">{document.actions.filter((action) => action.action === 'COMMENT').map((action) => <div className="comment-entry" key={action.id}><span className="comment-avatar">M</span><span><strong>Marketing team</strong><small>{action.comment} · {formatDate(action.created_at)}</small></span></div>)}</div><div className="decision-buttons"><button className="button button-secondary change-button" onClick={() => review('NEEDS_CHANGES')} disabled={Boolean(busyAction) || document.status === 'NEEDS_CHANGES'}><ArrowDownRight size={16} />Needs changes</button><button className="button button-approve" onClick={() => review('APPROVE')} disabled={Boolean(busyAction) || document.status === 'APPROVED'}><Check size={16} />{document.status === 'APPROVED' ? 'Approved' : 'Approve document'}</button></div></div></section>
  </>
}

function FindingCard({ finding, busyAction, onReview }) {
  const stateLabel = finding.review_state === 'OPEN' ? '' : finding.review_state === 'ACCEPTED' ? 'Suggestion accepted' : 'Suggestion rejected'
  return <article className={`finding-card ${finding.severity.toLowerCase()}`}><div className="finding-top"><span className={`severity-pill ${finding.severity.toLowerCase()}`}>{finding.severity}</span><span className="finding-category">{friendlyCategory(finding.category)}</span><span className="confidence">{Math.round(finding.confidence * 100)}% confidence</span></div><blockquote>{finding.matched_text}</blockquote><p className="finding-explanation">{finding.explanation}</p><div className="rule-source"><span>TRIGGERED RULE</span><strong>{finding.source_rule}</strong></div><div className="suggestion"><span>Suggested correction</span><p>{finding.suggested_correction || 'Review this wording with your brand team.'}</p></div>{finding.review_state !== 'OPEN' && <div className={`decision-label ${finding.review_state.toLowerCase()}`}><Check size={14} />{stateLabel}</div>}<div className="finding-actions"><button className="button button-secondary small-button" onClick={() => onReview('REJECT_SUGGESTION', finding.id)} disabled={Boolean(busyAction) || finding.review_state !== 'OPEN'}><X size={14} />Reject</button><button className="button button-primary small-button" onClick={() => onReview('ACCEPT_SUGGESTION', finding.id)} disabled={Boolean(busyAction) || finding.review_state !== 'OPEN'}>{busyAction === `ACCEPT_SUGGESTION-${finding.id}` ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}Accept suggestion</button></div></article>
}

function HighlightedText({ text, findings }) {
  const ranged = findings.filter((item) => item.start_position !== null && item.end_position !== null && item.start_position < item.end_position).sort((a, b) => a.start_position - b.start_position)
  const pieces = []
  let cursor = 0
  ranged.forEach((item) => {
    if (item.start_position < cursor) return
    if (item.start_position > cursor) pieces.push(text.slice(cursor, item.start_position))
    pieces.push(<mark key={item.id} className={`highlight ${item.severity.toLowerCase()}`} title={`${item.category}: ${item.source_rule}`}>{text.slice(item.start_position, item.end_position)}</mark>)
    cursor = item.end_position
  })
  pieces.push(text.slice(cursor))
  return <div className="highlighted-content">{pieces}</div>
}

function Guidelines({ brandId, brandName, brands, onBrands, onSelectBrand }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [rule, setRule] = useState({ category: 'BANNED_TERM', value: '', replacement: '', severity: 'High', explanation: '' })
  const [brandDraftName, setBrandDraftName] = useState('')
  const [brandDescription, setBrandDescription] = useState('')
  const [showBrandForm, setShowBrandForm] = useState(false)
  async function refresh() { if (!brandId) return; setLoading(true); try { setRules(await api.rules(brandId)); setError('') } catch (issue) { setError(issue.message) } finally { setLoading(false) } }
  useEffect(() => { refresh() }, [brandId])
  async function saveRule(event) {
    event.preventDefault(); setError('')
    const payload = { ...rule, brand_id: Number(brandId) }
    try {
      if (editingId) await api.updateRule(editingId, payload)
      else await api.createRule(payload)
      setRule({ category: 'BANNED_TERM', value: '', replacement: '', severity: 'High', explanation: '' }); setEditingId(null); await refresh()
    } catch (issue) { setError(issue.message) }
  }
  async function deleteRule(id) { if (!window.confirm('Delete this brand rule?')) return; try { await api.deleteRule(id); await refresh() } catch (issue) { setError(issue.message) } }
  async function addBrand(event) { event.preventDefault(); try { const created = await api.createBrand({ name: brandDraftName, description: brandDescription }); onBrands([...brands, created]); onSelectBrand(String(created.id)); setShowBrandForm(false); setBrandDraftName(''); setBrandDescription('') } catch (issue) { setError(issue.message) } }
  return <>
    <PageHeading eyebrow="BRAND GOVERNANCE" title="Guidelines that travel" detail="Manage the rules your team checks content against." action={<button className="button button-secondary" onClick={() => setShowBrandForm(!showBrandForm)}><Plus size={16} />Add brand</button>} />
    {error && <InlineError message={error} />}
    {showBrandForm && <form className="panel brand-create-form" onSubmit={addBrand}><div><label className="field-label" htmlFor="brand-name">Brand name</label><input id="brand-name" className="text-input" value={brandDraftName} onChange={(event) => setBrandDraftName(event.target.value)} required /></div><div><label className="field-label" htmlFor="brand-description">Description</label><input id="brand-description" className="text-input" value={brandDescription} onChange={(event) => setBrandDescription(event.target.value)} /></div><button className="button button-primary"><Plus size={15} />Create brand</button></form>}
    <div className="guideline-layout">
      <section className="panel rule-list-panel"><div className="panel-heading"><div><h2>{brandName} rulebook</h2><p>{rules.length} configured rules · Changes apply to new reviews</p></div><span className="rules-counter">{rules.length} <small>RULES</small></span></div>
        {loading ? <Loading label="Loading brand rules" /> : rules.length ? <div className="rule-table">{rules.map((item) => <div className="rule-row" key={item.id}><div className={`rule-type-icon ${item.category.toLowerCase()}`}><BookOpen size={16} /></div><div className="rule-row-main"><div><span className="category-tag">{friendlyCategory(item.category)}</span><span className={`severity-text ${item.severity.toLowerCase()}`}>{item.severity}</span></div><strong>{item.value}</strong><p>{item.explanation || (item.replacement ? `Preferred replacement: ${item.replacement}` : 'Configured brand language rule.')}</p>{item.replacement && <small className="replacement-label">Use instead: <strong>{item.replacement}</strong></small>}</div><div className="rule-row-actions"><button className="icon-button" title="Edit rule" aria-label={`Edit ${item.value}`} onClick={() => { setEditingId(item.id); setRule({ category: item.category, value: item.value, replacement: item.replacement, severity: item.severity, explanation: item.explanation }) }}><FileText size={16} /></button><button className="icon-button danger-icon" title="Delete rule" aria-label={`Delete ${item.value}`} onClick={() => deleteRule(item.id)}><Trash2 size={16} /></button></div></div>)}</div> : <EmptyInline title="No rules configured" detail="Create a rule to make the first review actionable." />}
      </section>
      <form className="panel rule-form" onSubmit={saveRule}><div className="panel-heading"><div><h2>{editingId ? 'Edit rule' : 'Add a rule'}</h2><p>{editingId ? 'Update this brand standard.' : 'Add to the active brand profile.'}</p></div>{editingId && <button type="button" className="icon-button" onClick={() => { setEditingId(null); setRule({ category: 'BANNED_TERM', value: '', replacement: '', severity: 'High', explanation: '' }) }} aria-label="Cancel edit"><X size={16} /></button>}</div><label className="field-label" htmlFor="rule-category">Rule category</label><select id="rule-category" className="text-input select-input" value={rule.category} onChange={(event) => setRule({ ...rule, category: event.target.value })}><option value="BANNED_TERM">Banned term</option><option value="PREFERRED_TERM">Preferred terminology</option><option value="PROMOTIONAL_CLAIM">Unsupported claim</option><option value="APPROVED_FACT">Approved product fact</option><option value="REQUIRED_PHRASE">Required phrase</option><option value="TONE">Tone guideline</option></select><label className="field-label" htmlFor="rule-value">Term or rule</label><input id="rule-value" className="text-input" value={rule.value} onChange={(event) => setRule({ ...rule, value: event.target.value })} required maxLength={300} placeholder="e.g. cheap" /><label className="field-label" htmlFor="rule-replacement">Suggested replacement <span className="optional">OPTIONAL</span></label><input id="rule-replacement" className="text-input" value={rule.replacement} onChange={(event) => setRule({ ...rule, replacement: event.target.value })} maxLength={300} placeholder="e.g. affordable" /><label className="field-label" htmlFor="rule-severity">Severity</label><select id="rule-severity" className="text-input select-input" value={rule.severity} onChange={(event) => setRule({ ...rule, severity: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select><label className="field-label" htmlFor="rule-explanation">Reviewer explanation</label><textarea id="rule-explanation" className="text-input form-textarea" value={rule.explanation} onChange={(event) => setRule({ ...rule, explanation: event.target.value })} maxLength={1000} placeholder="Why this rule matters" /><button className="button button-primary full-width"><Check size={16} />{editingId ? 'Save changes' : 'Add to rulebook'}</button></form>
    </div>
  </>
}

function History({ onOpen, onNew }) {
  const [documents, setDocuments] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.documents().then(setDocuments).catch((issue) => setError(issue.message)) }, [])
  return <><PageHeading eyebrow="AUDIT TRAIL" title="Review history" detail="Open past reviews to see original content, findings, and reviewer decisions." action={<span className="history-count">{documents?.length ?? '—'} DOCUMENTS</span>} />{error && <InlineError message={error} />}{!documents ? <Loading label="Loading review history" /> : documents.length ? <section className="panel history-panel"><div className="table-wrap"><table><thead><tr><th>DOCUMENT</th><th>TYPE</th><th>FINDINGS</th><th>STATUS</th><th>SCORE</th><th>SUBMITTED</th><th /></tr></thead><tbody>{documents.map((item) => <tr key={item.id}><td><button className="document-link" onClick={() => onOpen(item)}><span className="file-icon"><FileText size={17} /></span>{item.title}</button></td><td className="muted-cell">{item.content_type}</td><td><span className="finding-count small-count">{item.findings.length}</span></td><td><StatusBadge status={item.status} /></td><td><span className="score-text">{item.compliance_score}<small>/100</small></span></td><td className="muted-cell">{formatDate(item.submitted_at)}</td><td><button className="row-open" onClick={() => onOpen(item)} aria-label={`Open ${item.title}`}>↗</button></td></tr>)}</tbody></table></div></section> : <EmptyState title="Your history starts here" detail="Every submitted draft and its review decisions are saved locally." action="Start a review" onAction={onNew} />}</>
}

function Reports() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.reports().then(setData).catch((issue) => setError(issue.message)) }, [])
  return <><PageHeading eyebrow="WORKSPACE ANALYTICS" title="Patterns worth noticing" detail="A view of recurring issues from actual saved reviews." action={<span className="history-count"><Activity size={14} /> LIVE DATA</span>} />{error && <InlineError message={error} />}{!data ? <Loading label="Calculating report metrics" /> : <div className="reports-layout"><section className="panel report-highlight"><div className="report-accent"><ArrowUpRight size={18} /></div><span className="eyebrow">HIGH-SEVERITY FINDINGS</span><strong>{data.high_severity_count}</strong><p>High-severity matches across stored document reviews.</p></section><section className="panel report-panel"><div className="panel-heading"><div><h2>Most common violations</h2><p>Grouped by configured rule category</p></div></div>{data.common_violations.length ? <CategoryBars categories={data.common_violations} /> : <EmptyInline title="No violations recorded" detail="Run a review to begin building an analytics history." />}</section><section className="panel report-panel"><div className="panel-heading"><div><h2>Review status</h2><p>Saved workflow outcomes</p></div></div>{data.status_distribution.length ? <div className="status-distribution">{data.status_distribution.map((item) => <div className="status-row" key={item.status}><StatusBadge status={item.status} /><strong>{item.count}</strong></div>)}</div> : <EmptyInline title="No reviews yet" detail="Status counts appear after the first review." />}</section><section className="panel report-panel rules-report"><div className="panel-heading"><div><h2>Frequently triggered rules</h2><p>From matched findings in the document history</p></div></div>{data.frequently_violated_rules.length ? data.frequently_violated_rules.map((item, index) => <div className="frequent-rule" key={item.rule}><span className="rank-number">0{index + 1}</span><strong>{item.rule}</strong><span className="rule-hits">{item.count} {item.count === 1 ? 'match' : 'matches'}</span></div>) : <EmptyInline title="No triggered rules" detail="This report will populate when a review finds a match." />}</section></div>}</>
}

function StatusBadge({ status }) {
  const label = status === 'PENDING' ? 'Awaiting review' : status === 'NEEDS_CHANGES' ? 'Needs changes' : status.charAt(0) + status.slice(1).toLowerCase()
  return <span className={`status-badge ${status.toLowerCase()}`}><span />{label}</span>
}

function EmptyState({ title, detail, action, onAction }) {
  return <div className="empty-state panel"><span className="empty-icon"><FileText size={22} /></span><h2>{title}</h2><p>{detail}</p>{action && <button className="button button-primary" onClick={onAction}><Plus size={16} />{action}</button>}</div>
}

function EmptyInline({ title, detail }) { return <div className="empty-inline"><span className="empty-icon small"><FileText size={17} /></span><strong>{title}</strong><p>{detail}</p></div> }
function Loading({ label }) { return <div className="loading-state"><LoaderCircle className="spin" size={20} />{label}</div> }
function InlineError({ message }) { return <div className="inline-error" role="alert"><CircleHelp size={16} />{message}</div> }
function formatDate(date) { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date)) }
function friendlyCategory(category) { return ({ BANNED_TERM: 'Banned term', PREFERRED_TERM: 'Preferred term', PROMOTIONAL_CLAIM: 'Promotional claim', FACT_CONFLICT: 'Fact conflict', APPROVED_FACT: 'Approved fact', REQUIRED_PHRASE: 'Required phrase', TONE: 'Tone' })[category] || category.replaceAll('_', ' ').toLowerCase() }

export default App