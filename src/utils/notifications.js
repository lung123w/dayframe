export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function showNotification(title, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/vite.svg',
      badge: '/vite.svg',
      ...options
    });
  }
}

export function checkUpcomingTasks(tasks) {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  tasks.forEach(task => {
    if (!task.dueDate || task.status === 'completed') return;

    const dueDate = new Date(task.dueDate);
    
    // Overdue
    if (dueDate < now) {
      showNotification('Overdue Task!', {
        body: `"${task.title}" is overdue`,
        tag: `overdue-${task.id}`,
        requireInteraction: true
      });
    }
    // Due within 1 hour
    else if (dueDate <= oneHourFromNow) {
      showNotification('Task Due Soon!', {
        body: `"${task.title}" is due within 1 hour`,
        tag: `upcoming-${task.id}`
      });
    }
    // Due within 24 hours
    else if (dueDate <= oneDayFromNow) {
      showNotification('Task Due Today', {
        body: `"${task.title}" is due today`,
        tag: `today-${task.id}`
      });
    }
  });
}

export function startNotificationService(getTasks) {
  requestNotificationPermission();

  // Check every 30 minutes
  const checkInterval = setInterval(async () => {
    const tasks = await getTasks();
    checkUpcomingTasks(tasks);
  }, 30 * 60 * 1000);

  // Initial check after 1 minute
  setTimeout(async () => {
    const tasks = await getTasks();
    checkUpcomingTasks(tasks);
  }, 60 * 1000);

  return () => clearInterval(checkInterval);
}
