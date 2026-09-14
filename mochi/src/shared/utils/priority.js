export const urgencyScore = (deadline) => {
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
  Math.round((effort / 5) * 30)

export const userBoostScore = (userPriority) =>
  userPriority == null ? 0 : Math.round((userPriority / 5) * 20)

export const computePriority = (task) => {
  const urgency   = urgencyScore(task.deadline)
  const effort    = effortScore(task.effort ?? 3)
  const userBoost = userBoostScore(task.userPriority)
  return Math.min(100, urgency + effort + userBoost)
}

export const priorityMeta = (score) => {
  if (score >= 70) return { label: 'Urgent', bg: 'var(--mochi-pink)',  text: 'var(--mochi-pink-dark)'  }
  if (score >= 40) return { label: 'Soon',   bg: 'var(--mochi-peach)', text: 'var(--mochi-peach-dark)' }
  return              { label: 'Later',  bg: 'var(--mochi-mint)',  text: 'var(--mochi-mint-dark)'  }
}
