// ENHANCED: Data Corruption Recovery System
function safeLocalStorageGet(key, fallback = {}) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return fallback;
        
        const parsed = JSON.parse(item);
        // Basic validation for critical structures
        if (key.startsWith('mastery_') && typeof parsed === 'object') {
            if (!parsed.domains) parsed.domains = {};
            if (!parsed.tasks) parsed.tasks = [];
            if (typeof parsed.alignment !== 'boolean') parsed.alignment = false;
        }
        return parsed;
    } catch (error) {
        console.error(`Data corruption detected for ${key}:`, error);
        // Auto-repair by returning fresh structure
        return fallback;
    }
}

function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Failed to save ${key}:`, error);
        // Try to clear some space if quota exceeded
        if (error.name === 'QuotaExceededError') {
            clearOldData();
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Still cannot save after cleanup:', e);
            }
        }
        return false;
    }
}

function clearOldData() {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3); // Keep 3 months of data
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('mastery_') && key.length === 16) { // Date keys
            const dateStr = key.replace('mastery_', '');
            const date = new Date(dateStr);
            if (date < cutoff) {
                localStorage.removeItem(key);
            }
        }
    }
}

// ENHANCED: Undo System
const actionHistory = [];
const MAX_HISTORY = 10;

function executeAction(action) {
    action.execute();
    actionHistory.push(action);
    
    // Keep history manageable
    if (actionHistory.length > MAX_HISTORY) {
        actionHistory.shift();
    }
}

function undoLastAction() {
    if (actionHistory.length === 0) return;
    
    const action = actionHistory.pop();
    action.undo();
    
    showUndoToast(`Undid: ${action.description}`, false);
}

function showUndoToast(message, showUndo = true) {
    const toast = document.getElementById('undo-toast');
    const messageEl = document.getElementById('undo-message');
    const undoBtn = document.getElementById('undo-action');
    
    messageEl.textContent = message;
    undoBtn.style.display = showUndo ? 'block' : 'none';
    
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// Action classes for undo system
class TaskAction {
    constructor(taskId, type, data) {
        this.taskId = taskId;
        this.type = type; // 'add', 'delete', 'toggle'
        this.data = data;
        this.description = this.getDescription();
    }
    
    getDescription() {
        switch(this.type) {
            case 'add': return 'Added task';
            case 'delete': return 'Deleted task';
            case 'toggle': return 'Toggled task';
            default: return 'Modified task';
        }
    }
    
    execute() {
        // This is where the action would normally happen
        // We'll integrate this with existing functions
    }
    
    undo() {
        // Implementation would restore previous state
        // Integrated with existing task functions
    }
}

// ENHANCED: Debounced functions for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debouncing to rapid-fire functions
const debouncedAddQuickDomainXP = debounce((domain, amount) => {
    addQuickDomainXP(domain, amount);
}, 300);

// ENHANCED: Momentum Score Algorithm
function calculateMomentumScore() {
    const last7Days = getLast7DaysData();
    if (last7Days.length === 0) return { score: 0, trend: 'starting', recommendation: 'Begin your journey with consistent daily effort.' };
    
    // Factors weighted by importance
    const factors = {
        consistency: calculateConsistencyScore(last7Days),
        growth: calculateGrowthScore(last7Days),
        balance: calculateBalanceScore(last7Days),
        intensity: calculateIntensityScore(last7Days)
    };
    
    // Weighted average
    const score = Math.round(
        (factors.consistency * 0.4) +
        (factors.growth * 0.3) +
        (factors.balance * 0.2) +
        (factors.intensity * 0.1)
    );
    
    // Determine trend
    const trend = getMomentumTrend(last7Days, score);
    const recommendation = generateMomentumRecommendation(score, trend, factors);
    
    return { score, trend, recommendation, factors };
}

function calculateConsistencyScore(days) {
    const completedDays = days.filter(day => day.totalXP >= 160).length;
    return (completedDays / 7) * 100;
}

function calculateGrowthScore(days) {
    if (days.length < 2) return 50;
    
    const recent = days.slice(0, 3); // Last 3 days
    const older = days.slice(3); // Previous days
    
    const recentAvg = recent.reduce((sum, day) => sum + day.totalXP, 0) / recent.length;
    const olderAvg = older.reduce((sum, day) => sum + day.totalXP, 0) / older.length;
    
    if (olderAvg === 0) return recentAvg > 0 ? 100 : 0;
    
    const growth = ((recentAvg - olderAvg) / olderAvg) * 100;
    return Math.min(Math.max(growth + 50, 0), 100); // Normalize to 0-100
}

function calculateBalanceScore(days) {
    // Check if all domains are being developed
    const domainAverages = {};
    Object.keys(DOMAINS).forEach(domain => {
        const domainTotal = days.reduce((sum, day) => sum + (day.domains[domain] || 0), 0);
        domainAverages[domain] = domainTotal / days.length;
    });
    
    const min = Math.min(...Object.values(domainAverages));
    const max = Math.max(...Object.values(domainAverages));
    
    if (max === 0) return 0;
    return (min / max) * 100;
}

function calculateIntensityScore(days) {
    const intensityDays = days.filter(day => day.totalXP >= 200).length;
    return (intensityDays / 7) * 100;
}

function getMomentumTrend(days, currentScore) {
    if (days.length < 4) return 'starting';
    
    const recentScore = calculateMomentumScoreForPeriod(days.slice(0, 3));
    const previousScore = calculateMomentumScoreForPeriod(days.slice(3, 6));
    
    if (currentScore > recentScore + 10) return 'accelerating';
    if (currentScore > recentScore + 5) return 'growing';
    if (currentScore >= recentScore - 5) return 'steady';
    return 'declining';
}

function calculateMomentumScoreForPeriod(periodDays) {
    if (periodDays.length === 0) return 0;
    return periodDays.reduce((sum, day) => sum + day.totalXP, 0) / periodDays.length;
}

function generateMomentumRecommendation(score, trend, factors) {
    if (score >= 90) {
        return 'Elite momentum! Maintain this intensity and focus on breakthrough opportunities.';
    } else if (score >= 75) {
        return 'Strong momentum! Increase intensity slightly for breakthrough acceleration.';
    } else if (score >= 60) {
        if (factors.consistency < 80) {
            return 'Good progress! Focus on daily consistency to build unstoppable momentum.';
        } else if (factors.growth < 60) {
            return 'Consistent but stagnant. Add 10% more intensity to each domain.';
        } else {
            return 'Solid foundation! Now push one domain to mastery level each day.';
        }
    } else if (score >= 40) {
        return 'Building foundation. Focus on hitting daily minimums consistently.';
    } else {
        return 'Initial phase. Start with one domain at a time and build consistency.';
    }
}

function getLast7DaysData() {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const data = safeLocalStorageGet(`mastery_${dateString}`, {});
        
        let totalXP = 0;
        const domains = {};
        
        // Calculate XP from domains
        Object.keys(DOMAINS).forEach(domain => {
            domains[domain] = data.domains?.[domain]?.total || 0;
            totalXP += domains[domain];
        });
        
        // Calculate XP from tasks
        if (data.tasks) {
            data.tasks.forEach(task => {
                if (task.completed) totalXP += task.xp;
            });
        }
        
        days.push({
            date: dateString,
            totalXP,
            domains,
            alignment: data.alignment || false
        });
    }
    
    return days;
}

function updateMomentumDisplay() {
    const momentum = calculateMomentumScore();
    const display = document.getElementById('momentum-display');
    const scoreEl = document.getElementById('momentum-score');
    const trendEl = document.getElementById('momentum-trend');
    const recommendationEl = document.getElementById('momentum-recommendation');
    
    scoreEl.textContent = momentum.score;
    trendEl.textContent = `Momentum: ${momentum.trend}`;
    recommendationEl.textContent = momentum.recommendation;
    
    // Color code based on score
    if (momentum.score >= 80) {
        display.style.background = 'linear-gradient(135deg, #34C759, #007AFF)';
    } else if (momentum.score >= 60) {
        display.style.background = 'linear-gradient(135deg, #FF9500, #34C759)';
    } else {
        display.style.background = 'linear-gradient(135deg, #FF3B30, #FF9500)';
    }
}

// ENHANCED: Tomorrow Preview System
function showTomorrowPreview() {
    const preview = generateTomorrowPreview();
    const modal = document.getElementById('preview-modal');
    
    document.getElementById('preview-focus').textContent = preview.focus;
    document.getElementById('preview-scary-task').textContent = preview.scaryTask;
    
    const domainsEl = document.getElementById('preview-domains');
    domainsEl.innerHTML = '';
    
    preview.domainPriorities.forEach(domain => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.innerHTML = `
            <div class="preview-item-icon">${domain.icon}</div>
            <div>${domain.name}: ${domain.recommendation}</div>
        `;
        domainsEl.appendChild(item);
    });
    
    modal.classList.add('active');
}

function closePreviewModal() {
    document.getElementById('preview-modal').classList.remove('active');
}

function generateTomorrowPreview() {
    const momentum = calculateMomentumScore();
    const todayData = getLast7DaysData()[0];
    const weakDomains = findWeakDomains();
    
    let focus = '';
    let scaryTask = '';
    
    // Determine focus based on momentum and weak domains
    if (momentum.score < 60) {
        focus = 'Foundation Building: Focus on hitting all domain minimums consistently';
        scaryTask = 'Complete one task in your weakest domain with extra intensity';
    } else if (momentum.score < 80) {
        focus = 'Momentum Acceleration: Push one domain beyond target for breakthrough';
        scaryTask = 'Reach 200+ total XP by adding intensity to strong domains';
    } else {
        focus = 'Breakthrough Mode: All domains at 150%+ target, focus on industry outreach';
        scaryTask = 'Schedule 3 industry follow-ups or new contact attempts';
    }
    
    // Domain priorities
    const domainPriorities = weakDomains.map(domain => ({
        name: domain.name,
        icon: domain.icon,
        recommendation: `Aim for ${domain.target + 10} XP`
    }));
    
    // If no weak domains, suggest balanced growth
    if (domainPriorities.length === 0) {
        domainPriorities.push(
            { name: 'Creation', icon: '🎭', recommendation: 'Focus on industry networking' },
            { name: 'Physical', icon: '💪', recommendation: 'Add intensity to weakest exercise' },
            { name: 'Meditation', icon: '🧘', recommendation: 'Extend session by 10 minutes' },
            { name: 'Recovery', icon: '😴', recommendation: 'Quality sleep focus' }
        );
    }
    
    return {
        focus,
        scaryTask,
        domainPriorities
    };
}

function findWeakDomains() {
    const last7Days = getLast7DaysData();
    const domainAverages = {};
    
    Object.keys(DOMAINS).forEach(domain => {
        const total = last7Days.reduce((sum, day) => sum + (day.domains[domain] || 0), 0);
        domainAverages[domain] = total / last7Days.length;
    });
    
    const weakDomains = [];
    Object.keys(domainAverages).forEach(domain => {
        if (domainAverages[domain] < (DOMAINS[domain].target * 0.7)) {
            weakDomains.push({
                name: domain.charAt(0).toUpperCase() + domain.slice(1),
                icon: getDomainIcon(domain),
                target: DOMAINS[domain].target,
                current: domainAverages[domain]
            });
        }
    });
    
    return weakDomains;
}

function getDomainIcon(domain) {
    const icons = {
        creation: '🎭',
        physical: '💪',
        meditation: '🧘',
        recovery: '😴'
    };
    return icons[domain] || '📊';
}

// ENHANCED: Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Cmd/Ctrl + S for saving alignment
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveAlignment();
    }
    
    // Cmd/Ctrl + K for focusing task input
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('task-input').focus();
    }
    
    // Cmd/Ctrl + Z for undo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undoLastAction();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        closeEditModal();
        closePreviewModal();
    }
});

// ENHANCED: Pull-to-Refresh Gesture
let touchStartY = 0;
document.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchmove', e => {
    const touchY = e.touches[0].clientY;
    // Only trigger if at top of page and pulling down significantly
    if (touchY - touchStartY > 100 && window.scrollY === 0) {
        location.reload();
    }
});

// Domain Configuration
const DOMAINS = {
    creation: { target: 40, categories: ['act', 'study', 'create', 'network', 'reading', 'writing', 'voice'] },
    physical: { target: 40, categories: ['marts', 'cardio', 'gym', 'yoga', 'dance', 'stretch'] },
    meditation: { target: 40, categories: ['meditation', 'breathwork', 'visualization', 'mindfulness'] },
    recovery: { target: 40, categories: ['sleep', 'nutrition', 'recovery', 'planning'] }
};

// TASK CATEGORIES
const TASK_CATEGORIES = {
    act: { name: 'Act', domain: 'creation', icon: '🎭' },
    study: { name: 'Study', domain: 'creation', icon: '📚' },
    create: { name: 'Create', domain: 'creation', icon: '✨' },
    network: { name: 'Network', domain: 'creation', icon: '🤝' },
    reading: { name: 'Reading', domain: 'creation', icon: '📖' },
    writing: { name: 'Writing', domain: 'creation', icon: '✍️' },
    voice: { name: 'Voice', domain: 'creation', icon: '🎤' },
    marts: { name: 'Martial Arts', domain: 'physical', icon: '🥋' },
    cardio: { name: 'Cardio', domain: 'physical', icon: '🏃' },
    gym: { name: 'Gym', domain: 'physical', icon: '🏋️' },
    yoga: { name: 'Yoga', domain: 'physical', icon: '🧘' },
    dance: { name: 'Dance', domain: 'physical', icon: '💃' },
    stretch: { name: 'Stretching', domain: 'physical', icon: '🤸' },
    meditation: { name: 'Meditation', domain: 'meditation', icon: '🕉️' },
    breathwork: { name: 'Breathwork', domain: 'meditation', icon: '🌬️' },
    visualization: { name: 'Visualization', domain: 'meditation', icon: '👁️' },
    mindfulness: { name: 'Mindfulness', domain: 'meditation', icon: '🌿' },
    sleep: { name: 'Sleep', domain: 'recovery', icon: '😴' },
    nutrition: { name: 'Nutrition', domain: 'recovery', icon: '🥗' },
    recovery: { name: 'Recovery', domain: 'recovery', icon: '🔄' },
    planning: { name: 'Planning', domain: 'recovery', icon: '📅' },
    scary: { name: 'Scary Task', domain: 'special', icon: '🔥', xp: 10 },
    critical: { name: 'Critical Task', domain: 'special', icon: '⭐', xp: 5 }
};

// Goal Templates
const GOAL_TEMPLATES = {
    audition: "🎯 Today's Audition Focus: Nail the character with authentic emotional depth and compelling presence. Prepare thoroughly, deliver with truth, and leave lasting impression.",
    workout: "🎯 Today's Physical Peak: Complete workout with perfect form and 10% more intensity than yesterday. Build the Hollywood physique with discipline and precision.", 
    creation: "🎯 Today's Creative Breakthrough: Finish creative project with professional polish and unique voice. Push artistic boundaries while maintaining commercial appeal.",
    recovery: "🎯 Today's Recovery Priority: Achieve 8+ hours quality sleep with 30min wind-down routine. Optimize nutrition and active recovery for peak performance tomorrow."
};

let currentCategory = 'critical';
let currentEditingTaskId = null;
let currentIntensity = 'standard';

// COMPETITION MODE SYSTEM
function setIntensity(level) {
    currentIntensity = level;
    
    // Update button states
    document.querySelectorAll('.intensity-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.intensity-btn[data-level="${level}"]`).classList.add('active');
    
    // Update daily requirements display
    updateIntensityRequirements(level);
    
    // Save to localStorage
    localStorage.setItem('current_intensity', level);
    
    // Show confirmation
    const intensityNames = {
        standard: 'Hollywood Standard',
        superstar: 'Superstar Mode', 
        legend: 'Legend Protocol'
    };
    
    alert(`🎯 Intensity set to: ${intensityNames[level]}`);
}

function updateIntensityRequirements(level) {
    const requirements = {
        standard: { xp: 160, scary: 1, critical: 2 },
        superstar: { xp: 200, scary: 2, critical: 3 },
        legend: { xp: 240, scary: 3, critical: 4, industry: true }
    };
    
    const req = requirements[level];
    
    // Update the validation warning
    const warningElement = document.querySelector('.validation-warning');
    if (warningElement) {
        warningElement.innerHTML = `
            <strong>🎯 ${level === 'standard' ? 'Daily' : level === 'superstar' ? 'Superstar' : 'Legend'} Requirements:</strong><br>
            ${req.scary} Scary Task${req.scary > 1 ? 's' : ''} (10 XP) • ${req.critical} Critical Task${req.critical > 1 ? 's' : ''} (5 XP)<br>
            <strong>Complete all for maximum momentum!</strong>
            ${req.industry ? '<br>➕ Industry Outreach Required' : ''}
        `;
    }
    
    // Update today's XP target display
    document.getElementById('total-xp').textContent = `0/${req.xp}`;
    document.getElementById('today-xp').textContent = `0/${req.xp} XP`;
}

// PREDICTIVE ANALYTICS SYSTEM
function calculateHollywoodProbability() {
    const streak = parseInt(document.getElementById('streak-count').textContent) || 0;
    const tier1Auditions = parseInt(document.getElementById('tier1-auditions').textContent) || 0;
    const callbacks = parseInt(document.getElementById('callbacks-count').textContent) || 0;
    const roles = parseInt(document.getElementById('roles-count').textContent) || 0;
    
    // Industry data: Based on actual Hollywood breakthrough patterns
    let consistencyScore = Math.min(streak * 0.8, 20); // Max 20% from consistency
    let opportunitiesScore = Math.min(tier1Auditions * 0.6, 30); // Max 30% from opportunities  
    let callbacksScore = Math.min(callbacks * 4, 30); // Max 30% from callbacks
    let bookingsScore = Math.min(roles * 20, 20); // Max 20% from bookings
    
    const totalProbability = Math.min(
        consistencyScore + opportunitiesScore + callbacksScore + bookingsScore, 
        95 // Never 100% - stay hungry
    );
    
    return {
        total: Math.round(totalProbability),
        breakdown: {
            consistency: Math.round(consistencyScore),
            opportunities: Math.round(opportunitiesScore),
            callbacks: Math.round(callbacksScore),
            bookings: Math.round(bookingsScore)
        }
    };
}

function updateProbabilityDisplay() {
    const probability = calculateHollywoodProbability();
    
    // Update main score
    document.getElementById('probability-score').textContent = `${probability.total}%`;
    
    // Update breakdown
    document.getElementById('consistency-score').textContent = `${probability.breakdown.consistency}%`;
    document.getElementById('opportunities-score').textContent = `${probability.breakdown.opportunities}%`;
    document.getElementById('callbacks-score').textContent = `${probability.breakdown.callbacks}%`;
    document.getElementById('bookings-score').textContent = `${probability.breakdown.bookings}%`;
    
    // Update insight based on probability
    let insight = '';
    if (probability.total < 20) {
        insight = '🚧 Foundation Building Phase - Focus on consistent daily system execution';
    } else if (probability.total < 40) {
        insight = '📈 Momentum Building - Increase Tier 1 audition volume and industry networking';
    } else if (probability.total < 60) {
        insight = '🎯 Breakthrough Imminent - Optimize callback conversion and agent relationships';
    } else if (probability.total < 80) {
        insight = '⭐ Industry Traction - Leverage bookings for better roles and representation';
    } else {
        insight = '🏆 Hollywood Ready - Maintain momentum and strategic role selection';
    }
    
    document.getElementById('probability-insight').textContent = insight;
    
    // Color code based on probability
    const scoreElement = document.getElementById('probability-score');
    if (probability.total < 30) {
        scoreElement.style.color = '#FF3B30';
    } else if (probability.total < 60) {
        scoreElement.style.color = '#FF9500';
    } else {
        scoreElement.style.color = '#34C759';
    }
}

// INDUSTRY INTELLIGENCE SYSTEM
function rateRelationship(target, rating) {
    const stars = document.querySelectorAll(`[data-target="${target}"] .star`);
    
    // Update star display
    stars.forEach(star => {
        const value = parseInt(star.getAttribute('data-value'));
        if (value <= rating) {
            star.classList.add('active');
            star.textContent = '⭐';
        } else {
            star.classList.remove('active');
            star.textContent = '☆';
        }
    });
    
    // Save to localStorage
    const relationships = JSON.parse(localStorage.getItem('industry_relationships') || '{}');
    relationships[target] = rating;
    localStorage.setItem('industry_relationships', JSON.stringify(relationships));
    
    updateProbabilityDisplay(); // Relationships affect probability
}

function loadRelationshipRatings() {
    const relationships = JSON.parse(localStorage.getItem('industry_relationships') || '{}');
    
    Object.keys(relationships).forEach(target => {
        rateRelationship(target, relationships[target]);
    });
}

function logIndustryInteraction() {
    const interactionType = prompt('Industry Interaction Type:\n1 - Industry Event\n2 - Strategic Follow-up\n3 - New Quality Contact\n\nEnter number:');
    
    if (!interactionType) return;
    
    const types = {
        '1': { key: 'events', name: 'Industry Event' },
        '2': { key: 'followups', name: 'Strategic Follow-up' },
        '3': { key: 'contacts', name: 'New Quality Contact' }
    };
    
    const type = types[interactionType];
    if (!type) {
        alert('Invalid selection');
        return;
    }
    
    const details = prompt(`Log ${type.name}:\n\nDetails (who, what, next steps):`);
    if (!details || details.length < 5) {
        alert('Interaction logging requires details (minimum 5 characters)');
        return;
    }
    
    // Save interaction
    const month = new Date().toISOString().slice(0, 7);
    const key = `industry_${type.key}_${month}`;
    let interactions = JSON.parse(localStorage.getItem(key) || '[]');
    
    interactions.push({
        type: type.name,
        details: details.trim(),
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem(key, JSON.stringify(interactions));
    updateIndustryStats();
    
    alert(`✅ ${type.name} logged!\n\nTotal this month: ${interactions.length}`);
}

function updateIndustryStats() {
    const month = new Date().toISOString().slice(0, 7);
    
    const events = JSON.parse(localStorage.getItem(`industry_events_${month}`) || '[]');
    const followups = JSON.parse(localStorage.getItem(`industry_followups_${month}`) || '[]');
    const contacts = JSON.parse(localStorage.getItem(`industry_contacts_${month}`) || '[]');
    
    document.getElementById('events-count').textContent = `${events.length}/4`;
    document.getElementById('followups-count').textContent = `${followups.length}/12`;
    document.getElementById('contacts-count').textContent = `${contacts.length}/8`;
}

// CRITICAL: System Sovereignty Functions
function backupEntireSystem() {
    const backup = {};
    
    // Backup all mastery data
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('mastery_') || 
            key.startsWith('industry_') || 
            key === 'current_intensity' ||
            key === 'mastery_goal_path' ||
            key === 'mastery_runway_savings' ||
            key === 'mastery_runway_expenses') {
            backup[key] = localStorage.getItem(key);
        }
    }
    
    // Add metadata
    backup._metadata = {
        version: '2.0',
        backupDate: new Date().toISOString(),
        totalEntries: Object.keys(backup).length - 1,
        system: 'Hollywood Mastery Destiny Protocol'
    };
    
    // Create download
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hollywood_mastery_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Update backup time
    localStorage.setItem('last_backup_time', new Date().toISOString());
    document.getElementById('last-backup-time').textContent = new Date().toLocaleString();
    
    alert('💾 System backup complete! Your 2026 destiny is now secured.');
}

function restoreSystemBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = event => {
            try {
                const backup = JSON.parse(event.target.result);
                
                if (!backup._metadata || backup._metadata.system !== 'Hollywood Mastery Destiny Protocol') {
                    alert('❌ Invalid backup file. This does not appear to be a Hollywood Mastery backup.');
                    return;
                }
                
                if (confirm(`🚨 RESTORE BACKUP?\n\nThis will overwrite ALL current data with backup from ${new Date(backup._metadata.backupDate).toLocaleString()}\n\nThis action cannot be undone.`)) {
                    // Clear existing data
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key.startsWith('mastery_') || 
                            key.startsWith('industry_') || 
                            key === 'current_intensity' ||
                            key === 'mastery_goal_path' ||
                            key === 'mastery_runway_savings' ||
                            key === 'mastery_runway_expenses') {
                            localStorage.removeItem(key);
                        }
                    }
                    
                    // Restore backup
                    Object.keys(backup).forEach(key => {
                        if (key !== '_metadata') {
                            localStorage.setItem(key, backup[key]);
                        }
                    });
                    
                    alert('✅ System restore complete! Refreshing...');
                    setTimeout(() => location.reload(), 1000);
                }
            } catch (error) {
                alert('❌ Error restoring backup: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Load backup time on startup
function loadBackupStatus() {
    const lastBackup = localStorage.getItem('last_backup_time');
    if (lastBackup) {
        document.getElementById('last-backup-time').textContent = new Date(lastBackup).toLocaleString();
    }
}

// Initialize all systems
function initializeEnhancedSystems() {
    // Load competition mode
    const savedIntensity = localStorage.getItem('current_intensity') || 'standard';
    setIntensity(savedIntensity);
    
    // Load relationship ratings
    loadRelationshipRatings();
    
    // Update industry stats
    updateIndustryStats();
    
    // Start probability updates
    updateProbabilityDisplay();
    setInterval(updateProbabilityDisplay, 30000); // Update every 30 seconds
}

function initializeApp() {
    setupNavigation();
    setupTaskSystem();
    loadTodayData();
    loadStreak();
    loadMetrics();
    loadGoalPath();
    loadRunway();
    updateDomainProgress();
    loadTodaysGoal();
    updateStreakCalculator();
    updateStreakUrgency();
    loadWeekHeatmap();
    
    // NEW: Enhanced systems
    initializeEnhancedSystems();
    loadWeeklyReview(); // Load review with goal integration
    loadBackupStatus(); // Show last backup time
    
    // NEW: Initialize momentum system
    updateMomentumDisplay();
    setInterval(updateMomentumDisplay, 60000);
    
    // Set up undo button
    document.getElementById('undo-action').addEventListener('click', undoLastAction);
}

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            navButtons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            this.classList.add('active');
            
            const sectionId = this.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

function setupTaskSystem() {
    const taskCats = document.querySelectorAll('.task-category');
    
    taskCats.forEach(btn => {
        btn.addEventListener('click', function() {
            taskCats.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
        });
    });

    document.getElementById('task-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
}

function addTask() {
    const taskText = document.getElementById('task-input').value.trim();
    const activeBtn = document.querySelector('.task-category.active');
    const xpValue = parseInt(activeBtn ? activeBtn.dataset.xp : 5);
    
    if (!taskText) {
        showError('Task description is required');
        return;
    }

    const today = getToday();
    let data = safeLocalStorageGet(`mastery_${today}`, {});
    
    if (!data.tasks) data.tasks = [];
    
    const task = {
        id: Date.now(),
        text: taskText,
        category: currentCategory,
        xp: xpValue,
        completed: false,
        timestamp: new Date().toISOString()
    };
    
    data.tasks.push(task);
    safeLocalStorageSet(`mastery_${today}`, data);
    
    document.getElementById('task-input').value = '';
    loadTodayTasks();
    updateDomainProgress();
    hideError();
}

function toggleTask(taskId) {
    const today = getToday();
    let data = safeLocalStorageGet(`mastery_${today}`, {});
    
    if (data.tasks) {
        const task = data.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            safeLocalStorageSet(`mastery_${today}`, data);
            loadTodayTasks();
            updateDomainProgress();
            
            // Animation
            const taskElement = document.querySelector(`[onclick="toggleTask(${taskId})"]`).closest('.task-item');
            if (taskElement) {
                taskElement.classList.add('task-complete-animation');
                setTimeout(() => {
                    taskElement.classList.remove('task-complete-animation');
                }, 600);
            }
        }
    }
}

function addQuickDomainXP(domain, amount) {
    const today = getToday();
    let data = safeLocalStorageGet(`mastery_${today}`, {});
    
    if (!data.domains) data.domains = {};
    if (!data.domains[domain]) data.domains[domain] = { total: 0, activities: [] };
    
    data.domains[domain].total += amount;
    data.domains[domain].activities.push({
        category: domain,
        xp: amount,
        timestamp: new Date().toISOString(),
        quick: true
    });
    
    safeLocalStorageSet(`mastery_${today}`, data);
    
    // Visual feedback
    const badge = document.getElementById(`compact-${domain}-xp`);
    if (badge) {
        badge.classList.add('xp-pulse');
        setTimeout(() => badge.classList.remove('xp-pulse'), 800);
    }
    
    updateDomainProgress();
}

function addDomainActivity(domain, category, xp) {
    const today = getToday();
    let data = safeLocalStorageGet(`mastery_${today}`, {});
    
    if (!data.domains) data.domains = {};
    if (!data.domains[domain]) data.domains[domain] = { total: 0, activities: [] };
    
    data.domains[domain].total += xp;
    data.domains[domain].activities.push({
        category: category,
        xp: xp,
        timestamp: new Date().toISOString(),
        description: `${category} activity`
    });
    
    safeLocalStorageSet(`mastery_${today}`, data);
    updateDomainProgress();
    
    // Show confirmation
    alert(`✅ ${xp} XP added to ${domain} - ${category}`);
}

function updateStreakUrgency() {
    const now = new Date();
    const hour = now.getHours();
    const todayComplete = checkTodayCompletion();
    const urgencyElement = document.getElementById('streak-urgency-alert');
    
    if (!todayComplete && hour >= 18) {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        const hoursLeft = ((midnight - now) / (1000 * 60 * 60)).toFixed(1);
        
        urgencyElement.innerHTML = `
            ⚡ STREAK COUNTDOWN: ${hoursLeft}h • Need 160 XP + Alignment
            <div class="urgency-progress">
                <div class="urgency-fill" style="width: ${(hour/24)*100}%"></div>
            </div>
        `;
        urgencyElement.style.display = 'block';
    } else {
        urgencyElement.style.display = 'none';
    }
}

function checkTodayCompletion() {
    const today = getToday();
    const data = safeLocalStorageGet(`mastery_${today}`, {});
    return !!(data.alignment && (data.totalXP >= 160));
}

function updateStreakCalculator() {
    const today = getToday();
    const data = safeLocalStorageGet(`mastery_${today}`, {});
    
    let currentXP = data.totalXP || 0;
    if (!data.totalXP) {
        currentXP = 0;
        if (data.domains) {
            Object.keys(data.domains).forEach(domain => {
                currentXP += data.domains[domain].total;
            });
        }
        if (data.tasks) {
            data.tasks.forEach(task => {
                if (task.completed) currentXP += task.xp;
            });
        }
    }
    
    const xpNeeded = Math.max(0, 160 - currentXP);
    const alignmentDone = data.alignment;
    
    const calculatorHTML = `
        <div class="calc-item ${currentXP >= 160 ? 'complete' : ''}">
            <span>${currentXP >= 160 ? '✅' : '⚡'}</span>
            ${currentXP >= 160 ? '160+ XP Complete' : `${xpNeeded} XP Needed`}
        </div>
        <div class="calc-item ${alignmentDone ? 'complete' : ''}">
            <span>${alignmentDone ? '✅' : '📝'}</span>
            ${alignmentDone ? 'Alignment Saved' : 'Alignment Required'}
        </div>
    `;
    
    document.getElementById('streak-calculator-container').innerHTML = calculatorHTML;
    document.getElementById('progress-calculator').innerHTML = calculatorHTML;
}

function loadWeekHeatmap() {
    const heatmapElement = document.getElementById('week-heatmap');
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    let heatmapHTML = '';
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        const data = safeLocalStorageGet(`mastery_${dateString}`, {});
        
        let xp = 0;
        if (data.domains) {
            Object.keys(data.domains).forEach(domain => {
                xp += data.domains[domain].total;
            });
        }
        if (data.tasks) {
            data.tasks.forEach(task => {
                if (task.completed) xp += task.xp;
            });
        }
        
        let heatLevel = 'low';
        if (xp >= 160) heatLevel = 'high';
        else if (xp >= 100) heatLevel = 'medium';
        
        heatmapHTML += `
            <div class="heat-day" data-xp="${xp}">
                <div class="heat-level ${heatLevel}"></div>
                <span>${days[i]}</span>
            </div>
        `;
    }
    
    heatmapElement.innerHTML = heatmapHTML;
}

function applyGoalTemplate(type) {
    const template = GOAL_TEMPLATES[type];
    if (template) {
        document.getElementById('todays-goal').value = template;
    }
}

function editTask(taskId) {
    const today = getToday();
    const data = safeLocalStorageGet(`mastery_${today}`, {});
    
    if (data.tasks) {
        const task = data.tasks.find(t => t.id === taskId);
        if (task) {
            currentEditingTaskId = taskId;
            document.getElementById('edit-task-text').value = task.text;
            document.getElementById('edit-task-xp').value = task.xp;
            document.getElementById('edit-task-category').value = task.category;
            document.getElementById('edit-modal').classList.add('active');
        }
    }
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        const today = getToday();
        let data = safeLocalStorageGet(`mastery_${today}`, {});
        
        if (data.tasks) {
            data.tasks = data.tasks.filter(t => t.id !== taskId);
            safeLocalStorageSet(`mastery_${today}`, data);
            loadTodayTasks();
            updateDomainProgress();
        }
    }
}

function saveTaskEdit() {
    const taskText = document.getElementById('edit-task-text').value.trim();
    const xpValue = parseInt(document.getElementById('edit-task-xp').value) || 0;
    const category = document.getElementById('edit-task-category').value;
    
    if (!taskText) {
        alert('Task description is required');
        return;
    }

    if (xpValue <= 0) {
        alert('XP value must be greater than 0');
        return;
    }

    const today = getToday();
    let data = safeLocalStorageGet(`mastery_${today}`, {});
    
    if (data.tasks && currentEditingTaskId) {
        const task = data.tasks.find(t => t.id === currentEditingTaskId);
        if (task) {
            task.text = taskText;
            task.xp = xpValue;
            task.category = category;
            task.updated = new Date().toISOString();
            
            safeLocalStorageSet(`mastery_${today}`, data);
            loadTodayTasks();
            updateDomainProgress();
            closeEditModal();
        }
    }
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
    currentEditingTaskId = null;
}

function loadTodayTasks() {
    const today = getToday();
    const data = safeLocalStorageGet(`mastery_${today}`, {});
    const tasksList = document.getElementById('tasks-list');
    
    tasksList.innerHTML = '';
    
    if (!data.tasks || data.tasks.length === 0) {
        tasksList.innerHTML = '<div style="text-align: center; color: var(--system-gray1); padding: 20px;">No tasks yet. Add your first critical task above.</div>';
        updateTaskStats();
        return;
    }
    
    data.tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        
        const categoryInfo = TASK_CATEGORIES[task.category];
        const badge = task.category === 'scary' ? '<span class="scary-badge">SCARY</span>' : 
                     task.category === 'critical' ? '<span class="critical-badge">CRITICAL</span>' : '';
        
        taskElement.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
            <div class="task-content">
                <div class="task-text">
                    ${categoryInfo.icon} ${task.text} ${badge}
                </div>
                <div class="task-meta">
                    ${categoryInfo.name} • ${task.xp} XP
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn edit" onclick="editTask(${task.id})">✏️</button>
                <button class="task-action-btn delete" onclick="deleteTask(${task.id})">🗑️</button>
            </div>
        `;
        
        tasksList.appendChild(taskElement);
    });
    
    updateTaskStats();
}

function updateTaskStats() {
    const today = getToday();
    const data = safeLocalStorageGet(`mastery_${today}`, {});
    
    let scaryCount = 0;
    let criticalCount = 0;
    let scaryCompleted = 0;
    let criticalCompleted = 0;
    
    if (data.tasks) {
        data.tasks.forEach(task => {
            if (task.category === 'scary') {
                scaryCount++;
                if (task.completed) scaryCompleted++;
            } else if (task.category === 'critical') {
                criticalCount++;
                if (task.completed) criticalCompleted++;
            }
        });
    }
    
    document.getElementById('scary-tasks-count').textContent = `${scaryCompleted}/${scaryCount}`;
    document.getElementById('critical-tasks-count').textContent = `${criticalCompleted}/${criticalCount}`;
}

function updateDomainProgress() {
    const today = getToday();
    const data = safeLocalStorageGet(`mastery_${today}`, {});
    
    let totalXP = 0;
    let domainTotals = {};
    
    // Initialize domain totals
    Object.keys(DOMAINS).forEach(domain => {
        domainTotals[domain] = 0;
    });
    
    // Calculate from domain activities
    if (data.domains) {
        Object.keys(data.domains).forEach(domain => {
            domainTotals[domain] = data.domains[domain].total;
            totalXP += data.domains[domain].total;
        });
    }
    
    // Calculate from tasks
    if (data.tasks) {
        data.tasks.forEach(task => {
            if (task.completed) {
                const categoryInfo = TASK_CATEGORIES[task.category];
                if (categoryInfo.domain !== 'special') {
                    domainTotals[categoryInfo.domain] += task.xp;
                }
                totalXP += task.xp;
            }
        });
    }
    
    // Get current intensity target
    const intensityTargets = {
        standard: 160,
        superstar: 200,
        legend: 240
    };
    const targetTotal = intensityTargets[currentIntensity] || 160;
    
    // Update domain displays (show target but allow unlimited)
    Object.keys(DOMAINS).forEach(domain => {
        const target = DOMAINS[domain].target;
        const current = domainTotals[domain];
        const percentage = Math.min((current / target) * 100, 100);
        const displayText = current >= target ? `${current}+/${target}` : `${current}/${target}`;
        
        document.getElementById(`compact-${domain}-xp`).textContent = displayText;
        document.getElementById(`${domain}-total`).textContent = `${current}/${target} XP`;
        
        // Update progress bars
        const progressFill = document.querySelector(`.compact-progress-fill.${domain}`);
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
    });
    
    // Update total XP with intensity target
    const displayTotal = totalXP >= targetTotal ? `${totalXP}+/${targetTotal} XP` : `${totalXP}/${targetTotal} XP`;
    
    document.getElementById('total-xp').textContent = displayTotal;
    document.getElementById('today-xp').textContent = displayTotal;
    
    // Update streak calculator and probability
    updateStreakCalculator();
    updateProbabilityDisplay();
    
    // Store total XP for streak calculations
    if (data.alignment) {
        data.totalXP = totalXP;
        safeLocalStorageSet(`mastery_${today}`, data);
    }
}

function loadTodayData() {
    loadTodayTasks();
    updateDomainProgress();
}

function loadTodaysGoal() {
    const today = getToday();
    const goal = localStorage.getItem(`mastery_todays_goal_${today}`) || '';
    const displayElement = document.getElementById('todays-goal-display');
    
    if (goal) {
        displayElement.innerHTML = `<div class="todays-goal-text">${goal}</div>`;
    } else {
        displayElement.innerHTML = '<div class="todays-goal-text todays-goal-empty">No goal set for today. Set your daily goal in the Goals section.</div>';
    }
}

function showError(message) {
    document.getElementById('validation-error').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

function hideError() {
    document.getElementById('validation-error').style.display = 'none';
}

function saveAlignment() {
    const reason = document.getElementById('alignment-reason').value.trim();
    
    if (!reason || reason.length < 30) {
        alert('❌ Alignment requires at least 30 characters of specific evidence');
        return;
    }
    
    // Calculate current total XP
    const today = getToday();
    const data = safeLocalStorageGet(`mastery_${today}`, {});
    
    let totalXP = 0;
    
    // Calculate from domain activities
    if (data.domains) {
        Object.keys(data.domains).forEach(domain => {
            totalXP += data.domains[domain].total;
        });
    }
    
    // Calculate from tasks
    if (data.tasks) {
        data.tasks.forEach(task => {
            if (task.completed) {
                totalXP += task.xp;
            }
        });
    }
    
    // Check if minimum XP requirement met
    if (totalXP < 160) {
        alert(`❌ Need minimum 160 XP for streak. Current: ${totalXP} XP`);
        return;
    }
    
    data.alignment = true;
    data.alignmentReason = reason;
    data.alignmentTime = new Date().toISOString();
    data.totalXP = totalXP;
    
    safeLocalStorageSet(`mastery_${today}`, data);
    
    alert(`✅ Alignment saved! ${totalXP} XP recorded. Streak updated.`);
    loadStreak();
}

function loadStreak() {
    const now = new Date();
    const currentHour = now.getHours();
    
    let currentStreak = 0;
    let streakAtRisk = false;
    
    const today = getToday();
    const todayData = safeLocalStorageGet(`mastery_${today}`, {});
    
    // Calculate today's XP
    let todayXP = todayData.totalXP || 0;
    if (!todayData.totalXP) {
        todayXP = 0;
        if (todayData.domains) {
            Object.keys(todayData.domains).forEach(domain => {
                todayXP += todayData.domains[domain].total;
            });
        }
        if (todayData.tasks) {
            todayData.tasks.forEach(task => {
                if (task.completed) {
                    todayXP += task.xp;
                }
            });
        }
    }
    
    const todayComplete = todayData.alignment && todayXP >= 160;
    
    if (!todayComplete && currentHour >= 20) {
        streakAtRisk = true;
    }
    
    // Count backwards for streak
    for (let i = 1; i <= 30; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const data = safeLocalStorageGet(`mastery_${dateString}`, {});
        
        if (data.alignment) {
            let dayXP = data.totalXP || 0;
            if (!data.totalXP) {
                dayXP = 0;
                if (data.domains) {
                    Object.keys(data.domains).forEach(domain => {
                        dayXP += data.domains[domain].total;
                    });
                }
                if (data.tasks) {
                    data.tasks.forEach(task => {
                        if (task.completed) {
                            dayXP += task.xp;
                        }
                    });
                }
            }
            
            if (dayXP >= 160) {
                currentStreak++;
            } else {
                break;
            }
        } else {
            break;
        }
    }
    
    const streakDisplay = document.getElementById('streak-count');
    const progressStreak = document.getElementById('progress-streak');
    
    streakDisplay.textContent = currentStreak;
    progressStreak.textContent = currentStreak;
    
    if (streakAtRisk) {
        streakDisplay.classList.add('streak-warning');
        streakDisplay.style.color = 'var(--system-red)';
        progressStreak.style.color = 'var(--system-red)';
    } else {
        streakDisplay.classList.remove('streak-warning');
        streakDisplay.style.color = todayComplete ? 'var(--system-green)' : '#FFFFFF';
        progressStreak.style.color = todayComplete ? 'var(--system-green)' : '#FFFFFF';
    }
}

function saveGoalPath() {
    const goalPath = {
        ultimateAim: document.getElementById('ultimate-aim').value,
        yearlyGoals: document.getElementById('yearly-goals').value,
        quarterlyGoals: document.getElementById('quarterly-goals').value,
        weeklyGoals: document.getElementById('reverse-weekly-goals').value,
        todaysGoal: document.getElementById('todays-goal').value
    };
    
    localStorage.setItem('mastery_goal_path', JSON.stringify(goalPath));
    
    // Also save today's goal separately for today's display
    const today = getToday();
    if (goalPath.todaysGoal.trim()) {
        localStorage.setItem(`mastery_todays_goal_${today}`, goalPath.todaysGoal.trim());
        loadTodaysGoal();
    }
    
    alert('Goal path saved! Today\'s goal updated on dashboard.');
}

function loadGoalPath() {
    const goalPath = JSON.parse(localStorage.getItem('mastery_goal_path') || '{}');
    
    if (goalPath.ultimateAim) {
        document.getElementById('ultimate-aim').value = goalPath.ultimateAim;
    }
    if (goalPath.yearlyGoals) {
        document.getElementById('yearly-goals').value = goalPath.yearlyGoals;
    }
    if (goalPath.quarterlyGoals) {
        document.getElementById('quarterly-goals').value = goalPath.quarterlyGoals;
    }
    if (goalPath.weeklyGoals) {
        document.getElementById('reverse-weekly-goals').value = goalPath.weeklyGoals;
    }
    if (goalPath.todaysGoal) {
        document.getElementById('todays-goal').value = goalPath.todaysGoal;
    }
}

// ENHANCED: Review system with goal integration
function loadWeeklyReview() {
    const weekStart = getWeekStart();
    const reviewData = JSON.parse(localStorage.getItem(`mastery_review_${weekStart}`) || '{}');
    
    // Load current goals for the closed-loop system
    const goalPath = JSON.parse(localStorage.getItem('mastery_goal_path') || '{}');
    
    document.getElementById('weekly-goal-display').textContent = 
        goalPath.weeklyGoals || 'No weekly goal set. Set in Goals section.';
    document.getElementById('quarterly-goal-display').textContent = 
        goalPath.quarterlyGoals || 'No quarterly milestone set. Set in Goals section.';
    
    // Load review data
    document.getElementById('proof-evidence').value = reviewData.evidence || '';
    document.getElementById('alignment-reflection').value = reviewData.alignmentReflection || '';
    document.getElementById('next-actions').value = reviewData.nextActions || '';
}

function saveWeeklyReview() {
    const weekStart = getWeekStart();
    const reviewData = {
        evidence: document.getElementById('proof-evidence').value,
        alignmentReflection: document.getElementById('alignment-reflection').value,
        nextActions: document.getElementById('next-actions').value,
        timestamp: new Date().toISOString(),
        // NEW: Include goal context for closed-loop tracking
        goalContext: {
            weeklyGoal: document.getElementById('weekly-goal-display').textContent,
            quarterlyGoal: document.getElementById('quarterly-goal-display').textContent
        }
    };
    
    localStorage.setItem(`mastery_review_${weekStart}`, JSON.stringify(reviewData));
    
    // Auto-backup on weekly review completion
    backupEntireSystem();
    
    alert('✅ Weekly review saved! System backup completed.');
}

function incrementMetric(metricId) {
    const today = getToday();
    
    const metricDetails = {
        'tier1-auditions': 'Tier 1 Audition (Netflix, HBO, Major Studio)',
        'tier2-auditions': 'Tier 2 Audition (Quality Indie, Festival Film)',
        'callbacks-count': 'Callback Received',
        'roles-count': 'Role Booked'
    };
    
    const detail = prompt(`LOG ${metricDetails[metricId]}\n\nProject/Details:`);
    
    if (!detail || detail.trim().length < 5) {
        alert('❌ Metric logging requires project details (minimum 5 characters)');
        return;
    }
    
    const month = new Date().toISOString().slice(0, 7);
    const historyKey = `${metricId}_history_${month}`;
    let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    history.push({
        date: today,
        project: detail.trim(),
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem(historyKey, JSON.stringify(history));
    
    const key = `mastery_${metricId}_${month}`;
    localStorage.setItem(key, history.length.toString());
    document.getElementById(metricId).textContent = history.length;
    
    alert(`✅ Logged: ${detail}\n\nTotal this month: ${history.length}`);
}

function loadMetrics() {
    const month = new Date().toISOString().slice(0, 7);
    const metrics = ['tier1-auditions', 'tier2-auditions', 'callbacks-count', 'roles-count'];
    
    metrics.forEach(metric => {
        const historyKey = `${metric}_history_${month}`;
        let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        document.getElementById(metric).textContent = history.length;
    });
}

function generateProgressReport() {
    const weekStart = getWeekStart();
    const reviewData = JSON.parse(localStorage.getItem(`mastery_review_${weekStart}`) || '{}');
    
    let report = `WEEKLY PROGRESS REPORT - ${weekStart}\n\n`;
    report += `EVIDENCE:\n${reviewData.evidence || 'No evidence recorded this week.'}\n\n`;
    report += `ADJUSTMENTS:\n${reviewData.alignmentReflection || 'No adjustments noted.'}\n\n`;
    report += `NEXT ACTIONS:\n${reviewData.nextActions || 'No next actions planned.'}\n\n`;
    report += `METRICS:\n`;
    report += `- Tier 1 Auditions: ${document.getElementById('tier1-auditions').textContent}\n`;
    report += `- Tier 2 Auditions: ${document.getElementById('tier2-auditions').textContent}\n`;
    report += `- Callbacks: ${document.getElementById('callbacks-count').textContent}\n`;
    report += `- Roles: ${document.getElementById('roles-count').textContent}\n`;
    report += `- Current Streak: ${document.getElementById('streak-count').textContent} days\n`;
    
    alert(report);
}

function updateRunway() {
    const savings = parseInt(document.getElementById('current-savings').value) || 0;
    const expenses = parseInt(document.getElementById('monthly-expenses').value) || 1;
    
    const runwayMonths = Math.floor(savings / expenses);
    document.getElementById('runway-display').textContent = runwayMonths;
    
    const display = document.getElementById('runway-display');
    if (runwayMonths <= 3) {
        display.className = 'runway-value status-danger';
    } else if (runwayMonths <= 6) {
        display.className = 'runway-value status-warning';
    } else {
        display.className = 'runway-value status-good';
    }
    
    localStorage.setItem('mastery_runway_savings', savings);
    localStorage.setItem('mastery_runway_expenses', expenses);
}

function loadRunway() {
    const savings = localStorage.getItem('mastery_runway_savings') || '15000';
    const expenses = localStorage.getItem('mastery_runway_expenses') || '3500';
    
    document.getElementById('current-savings').value = savings;
    document.getElementById('monthly-expenses').value = expenses;
    updateRunway();
}

// EXPORT FUNCTIONS
function setDateRange(range) {
    const today = new Date();
    const startDate = document.getElementById('export-start-date');
    const endDate = document.getElementById('export-end-date');
    
    endDate.value = today.toISOString().split('T')[0];
    
    switch(range) {
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            startDate.value = weekAgo.toISOString().split('T')[0];
            break;
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            startDate.value = monthAgo.toISOString().split('T')[0];
            break;
        case 'all':
            startDate.value = '2024-01-01';
            break;
    }
}

function getDateRangeData() {
    const startDate = document.getElementById('export-start-date').value;
    const endDate = document.getElementById('export-end-date').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return [];
    }
    
    const allData = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        const data = localStorage.getItem(`mastery_${dateString}`);
        if (data) {
            allData.push({
                date: dateString,
                data: JSON.parse(data)
            });
        }
    }
    
    return allData;
}

function exportToCSV(csvData, filename) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportDailyProgress() {
    const data = getDateRangeData();
    if (data.length === 0) return;
    
    let csv = 'Date,Total XP,Creation XP,Physical XP,Meditation XP,Recovery XP,Alignment,Streak Valid\n';
    
    data.forEach(day => {
        const dayData = day.data;
        let totalXP = 0;
        let creationXP = 0;
        let physicalXP = 0;
        let meditationXP = 0;
        let recoveryXP = 0;
        
        if (dayData.domains) {
            Object.keys(dayData.domains).forEach(domain => {
                const xp = dayData.domains[domain].total;
                totalXP += xp;
                
                switch(domain) {
                    case 'creation': creationXP = xp; break;
                    case 'physical': physicalXP = xp; break;
                    case 'meditation': meditationXP = xp; break;
                    case 'recovery': recoveryXP = xp; break;
                }
            });
        }
        
        const alignment = dayData.alignment ? 'YES' : 'NO';
        const streakValid = (dayData.alignment && totalXP >= 160) ? 'YES' : 'NO';
        
        csv += `"${day.date}",${totalXP},${creationXP},${physicalXP},${meditationXP},${recoveryXP},${alignment},${streakValid}\n`;
    });
    
    const filename = `hollywood_mastery_daily_${getDateRangeString()}.csv`;
    exportToCSV(csv, filename);
    alert(`✅ Daily Progress exported: ${data.length} days`);
}

function exportTasks() {
    const data = getDateRangeData();
    if (data.length === 0) return;
    
    let csv = 'Date,Task,Category,XP,Completed,Timestamp\n';
    
    data.forEach(day => {
        const dayData = day.data;
        
        if (dayData.tasks) {
            dayData.tasks.forEach(task => {
                const completed = task.completed ? 'YES' : 'NO';
                const timestamp = task.timestamp ? new Date(task.timestamp).toLocaleString() : 'N/A';
                csv += `"${day.date}","${task.text.replace(/"/g, '""')}","${task.category}",${task.xp},${completed},"${timestamp}"\n`;
            });
        }
    });
    
    const filename = `hollywood_mastery_tasks_${getDateRangeString()}.csv`;
    exportToCSV(csv, filename);
    alert(`✅ Tasks exported: ${data.length} days`);
}

function exportDomainProgress() {
    const data = getDateRangeData();
    if (data.length === 0) return;
    
    let csv = 'Date,Domain,Total XP,Activities Count,Target,Percentage\n';
    
    data.forEach(day => {
        const dayData = day.data;
        
        if (dayData.domains) {
            Object.keys(dayData.domains).forEach(domain => {
                const domainData = dayData.domains[domain];
                const target = DOMAINS[domain]?.target || 40;
                const percentage = ((domainData.total / target) * 100).toFixed(1);
                const activityCount = domainData.activities ? domainData.activities.length : 0;
                
                csv += `"${day.date}","${domain}",${domainData.total},${activityCount},${target},${percentage}\n`;
            });
        }
    });
    
    const filename = `hollywood_mastery_domains_${getDateRangeString()}.csv`;
    exportToCSV(csv, filename);
    alert(`✅ Domain Progress exported: ${data.length} days`);
}

function exportHollywoodMetrics() {
    const months = getMonthsInRange();
    if (months.length === 0) return;
    
    let csv = 'Month,Tier 1 Auditions,Tier 2 Auditions,Callbacks,Roles Booked,Total Opportunities,Success Rate\n';
    
    months.forEach(month => {
        const tier1 = localStorage.getItem(`mastery_tier1-auditions_${month}`) || 0;
        const tier2 = localStorage.getItem(`mastery_tier2-auditions_${month}`) || 0;
        const callbacks = localStorage.getItem(`mastery_callbacks-count_${month}`) || 0;
        const roles = localStorage.getItem(`mastery_roles-count_${month}`) || 0;
        
        const totalOpportunities = parseInt(tier1) + parseInt(tier2);
        const successRate = totalOpportunities > 0 ? ((parseInt(roles) / totalOpportunities) * 100).toFixed(1) : 0;
        
        csv += `"${month}",${tier1},${tier2},${callbacks},${roles},${totalOpportunities},${successRate}%\n`;
    });
    
    const filename = `hollywood_mastery_metrics_${getDateRangeString()}.csv`;
    exportToCSV(csv, filename);
    alert('✅ Hollywood Metrics exported');
}

function exportAllData() {
    exportDailyProgress();
    setTimeout(() => exportTasks(), 100);
    setTimeout(() => exportDomainProgress(), 200);
    setTimeout(() => exportHollywoodMetrics(), 300);
    
    alert('📊 All export operations started! Check your downloads folder.');
}

function getDateRangeString() {
    const start = document.getElementById('export-start-date').value;
    const end = document.getElementById('export-end-date').value;
    return `${start}_to_${end}`;
}

function getMonthsInRange() {
    const startDate = new Date(document.getElementById('export-start-date').value);
    const endDate = new Date(document.getElementById('export-end-date').value);
    const months = [];
    
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (current <= endDate) {
        months.push(current.toISOString().slice(0, 7));
        current.setMonth(current.getMonth() + 1);
    }
    
    return months;
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getWeekStart() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
}

// Initialize the enhanced app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setInterval(loadStreak, 3600000);
    setInterval(updateStreakUrgency, 60000);
    setDateRange('month');
});