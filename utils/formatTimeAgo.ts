export function formatTimeAgo(dateString: string | null): string {
    if (!dateString) return 'Never updated';
    
    const utcDate = new Date(dateString);
    const now = new Date();
    
    // Calculate the time difference in milliseconds
    const diff = now.getTime() - utcDate.getTime();
    
    // Convert to appropriate time units
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) {
      return `Updated ${years} ${years === 1 ? 'year' : 'years'} ago`;
    } else if (months > 0) {
      return `Updated ${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else if (days > 0) {
      return `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (hours > 0) {
      return `Updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (minutes > 0) {
      return `Updated ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return 'Updated just now';
    }
  }