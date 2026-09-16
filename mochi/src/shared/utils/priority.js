export const urgencyScore = (deadline) => {
  if (!Number.isFinite(deadline)) return 5
  const msPerDay = 86_400_000
  const daysLeft = (deadline - Date.now()) / msPerDay
  if (daysLeft <= 0)  return 50
  if (daysLeft <= 1)  return 45
  if (daysLeft <= 3)  return 35
  if (daysLeft <= 7)  return 25
  if (daysLeft <= 14) return 15
  return 5
}

export const effortScore = (effort) =>
  Math.round((effort / 5) * 22)

export const userBoostScore = (userPriority) =>
  userPriority == null ? 0 : Math.round((userPriority / 5) * 20)

const estimatedEffort = (task) => {
  if (Number.isFinite(task.effort)) return task.effort
  const title = `${task.title ?? ''} ${task.additionalNotes ?? ''}`.toLowerCase()
  if (/exam|paper|project|presentation|research|portfolio/.test(title)) return 5
  if (/review|study|practice|chapter|assignment/.test(title)) return 3
  return title.length > 70 ? 3 : 2
}

const taskTypeScore = (task) => {
  const title = `${task.title ?? ''} ${task.additionalNotes ?? ''}`.toLowerCase()
  if (/exam|quiz|test|recitation|deadline/.test(title)) return 12
  if (/paper|project|presentation|research/.test(title)) return 9
  return 4
}

export const computePriority = (task) => {
  if (task.isDone) return 0
  const urgency = urgencyScore(task.deadline)
  const effort = effortScore(estimatedEffort(task))
  const taskType = taskTypeScore(task)
  const overdueBoost = Number.isFinite(task.deadline) && task.deadline < Date.now() ? 10 : 0
  const subjectBoost = task.category ? 3 : 0
  const userBoost = userBoostScore(task.userPriority)
  return Math.max(1, Math.min(100, urgency + effort + taskType + overdueBoost + subjectBoost + userBoost))
}

export const priorityMeta = (score, isDone = false) => {
  if (isDone) return { label: 'Done', bg: '#e7f6e8', text: '#55775b' }
  if (score >= 85) return { label: 'Do first',   bg: 'var(--mochi-pink)', text: 'var(--mochi-pink-dark)' }
  if (score >= 65) return { label: 'Start soon', bg: 'var(--mochi-peach)', text: 'var(--mochi-peach-dark)' }
  if (score >= 40) return { label: 'Plan ahead', bg: 'var(--mochi-lavender)', text: 'var(--mochi-lavender-dark)' }
  return { label: 'Low pressure', bg: '#e7f6e8', text: '#55775b' }
}
