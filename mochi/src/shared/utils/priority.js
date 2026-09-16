const DAY = 86_400_000

const daysUntil = (deadline) => {
  if (!Number.isFinite(deadline)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(deadline)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / DAY)
}

export const urgencyScore = (deadline) => {
  const daysLeft = daysUntil(deadline)
  if (daysLeft == null) return 2
  if (daysLeft < 0) return 55
  if (daysLeft === 0) return 50
  if (daysLeft === 1) return 45
  if (daysLeft <= 3) return 38
  if (daysLeft <= 7) return 30
  if (daysLeft <= 14) return 22
  if (daysLeft <= 21) return 12
  return 6
}

export const userBoostScore = (userPriority) =>
  userPriority == null ? 0 : Math.round((userPriority / 5) * 20)

const taskText = (task) => `${task.title ?? ''} ${task.additionalNotes ?? ''}`

// SA/FA require a standalone label. The optional number intentionally permits SA1 and FA2.
const isAssessmentLabel = (text, abbreviation, fullName) =>
  new RegExp(`\\b${fullName}\\b`, 'i').test(text) ||
  new RegExp(`\\b${abbreviation}(?:\\s*-?\\s*\\d+\\b|\\b(?=\\s*(?:assessment|quiz|test|oral|written|:|-|$)))`, 'i').test(text)

export const classifyTaskType = (task) => {
  const text = taskText(task)
  const title = text.toLowerCase()
  const summative = isAssessmentLabel(text, 'sa', 'summative\\s+assessment')
  const formative = isAssessmentLabel(text, 'fa', 'formative\\s+assessment')

  if (/\bfinal(?:\s+exam)?\b|\bfinals\b/i.test(text)) return { kind: 'final-exam', taskTypeScore: 28, baseEffort: 5, prepWindowDays: 14, prepBoost: 18, outsidePrepBoost: 5, gradedWeight: 28, isExam: true }
  if (/\bmidterm(?:\s+exam)?\b|\bmidterms\b/i.test(text)) return { kind: 'midterm-exam', taskTypeScore: 24, baseEffort: 5, prepWindowDays: 12, prepBoost: 16, outsidePrepBoost: 4, gradedWeight: 24, isExam: true }
  if (summative) return { kind: 'summative-assessment', taskTypeScore: 26, baseEffort: 4, prepWindowDays: 12, prepBoost: 15, outsidePrepBoost: 4, gradedWeight: 26, isExam: false }
  if (formative) return { kind: 'formative-assessment', taskTypeScore: 12, baseEffort: 2, prepWindowDays: 5, prepBoost: 10, outsidePrepBoost: 2, gradedWeight: 12, isExam: false }
  if (/\bassessment\b/i.test(text)) return { kind: 'assessment', taskTypeScore: 20, baseEffort: 3, prepWindowDays: 10, prepBoost: 13, outsidePrepBoost: 3, gradedWeight: 20, isExam: false }
  if (/\boral\s+test\b|\brecitation\b|\bpresentation\b/i.test(text)) return { kind: 'oral-or-presentation', taskTypeScore: 18, baseEffort: 3, prepWindowDays: 8, prepBoost: 12, outsidePrepBoost: 3, gradedWeight: 18, isExam: false }
  if (/\bcase\s+study\b|\bresearch\b|\bproject\b|\breport\b|\bpaper\b/i.test(text)) return { kind: 'project-work', taskTypeScore: 22, baseEffort: 4, prepWindowDays: 10, prepBoost: 14, outsidePrepBoost: 4, gradedWeight: 16, isExam: false }
  if (/\bposter\b|\bworksheet\b|\bupload\b|\bsubmit\b/i.test(title)) return { kind: 'simple-submission', taskTypeScore: 8, baseEffort: 2, prepWindowDays: 5, prepBoost: 8, outsidePrepBoost: 0, gradedWeight: 4, isExam: false }
  if (/\bquiz\b|\btest\b/i.test(title)) return { kind: 'test', taskTypeScore: 16, baseEffort: 3, prepWindowDays: 7, prepBoost: 11, outsidePrepBoost: 3, gradedWeight: 14, isExam: false }
  return { kind: 'general', taskTypeScore: 8, baseEffort: 2, prepWindowDays: 7, prepBoost: 8, outsidePrepBoost: 0, gradedWeight: 0, isExam: false }
}

const estimatedEffort = (task, type) => {
  const savedEffort = Number.isFinite(task.effort) ? task.effort : 0
  const text = taskText(task)
  const detailEffort = /\bportfolio\b|\bcomprehensive\b|\bgroup\b/i.test(text) ? 5 : text.length > 70 ? 3 : 0
  return Math.max(type.baseEffort, savedEffort, detailEffort)
}

const workloadScore = (effort) => Math.max(5, Math.min(24, Math.round((effort / 5) * 24)))

/** Exposes score ingredients for development inspection without logging student data. */
export const getPriorityBreakdown = (task) => {
  if (task.isDone) return { finalScore: 0, urgencyScore: 0, taskTypeScore: 0, workloadScore: 0, prepWindowBoost: 0, dampener: 1, daysLeft: daysUntil(task.deadline), type: 'completed', gradedWeight: 0, effort: 0 }

  const daysLeft = daysUntil(task.deadline)
  const type = classifyTaskType(task)
  const effort = estimatedEffort(task, type)
  const urgency = urgencyScore(task.deadline)
  const workload = workloadScore(effort)
  const insidePrepWindow = daysLeft != null && daysLeft >= 0 && daysLeft <= type.prepWindowDays
  const prepWindowBoost = insidePrepWindow ? type.prepBoost : type.outsidePrepBoost
  const taskTypeScore = type.isExam && daysLeft != null && daysLeft > 14
    ? Math.round(type.taskTypeScore * 0.65)
    : type.taskTypeScore
  const overdueBoost = daysLeft != null && daysLeft < 0 ? 20 : 0
  const tomorrowEffortBoost = daysLeft === 1 && effort >= 3 ? 9 : 0
  const subjectBoost = task.category ? 3 : 0
  const dampener = daysLeft != null && daysLeft > 14 && type.isExam ? 0.85 : 1
  const rawScore = urgency + workload + taskTypeScore + prepWindowBoost + overdueBoost + tomorrowEffortBoost + subjectBoost + userBoostScore(task.userPriority)
  const finalScore = Math.max(1, Math.min(100, Math.round(rawScore * dampener)))

  return {
    finalScore: daysLeft != null && daysLeft < 0 ? Math.max(85, finalScore) : finalScore,
    urgencyScore: urgency,
    taskTypeScore,
    workloadScore: workload,
    prepWindowBoost,
    dampener,
    daysLeft,
    type: type.kind,
    gradedWeight: type.gradedWeight,
    effort,
  }
}

export const computePriority = (task) => getPriorityBreakdown(task).finalScore

export const priorityMeta = (score, isDone = false) => {
  if (isDone) return { label: 'Done', bg: '#e7f6e8', text: '#55775b' }
  if (score >= 85) return { label: 'Do first', bg: 'var(--mochi-pink)', text: 'var(--mochi-pink-dark)' }
  if (score >= 70) return { label: 'Start today', bg: 'var(--mochi-peach)', text: 'var(--mochi-peach-dark)' }
  if (score >= 55) return { label: 'Start soon', bg: 'var(--mochi-lavender)', text: 'var(--mochi-lavender-dark)' }
  if (score >= 35) return { label: 'Plan ahead', bg: '#f6e6f1', text: 'var(--mochi-text-soft)' }
  return { label: 'Low pressure', bg: '#e7f6e8', text: '#55775b' }
}
