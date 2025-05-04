document.addEventListener('DOMContentLoaded', () => {
    const leetcodeUsernameInput = document.getElementById('leetcodeUsername');
    const githubUsernameInput = document.getElementById('githubUsername');
    const githubTokenInput = document.getElementById('githubToken');
    const repoNameInput = document.getElementById('repoName');
    const saveSettingsButton = document.getElementById('saveSettings');
  
    chrome.storage.local.get(['leetcodeUsername', 'githubUsername', 'githubToken', 'repoName'], (data) => {
      leetcodeUsernameInput.value = data.leetcodeUsername || '';
      githubUsernameInput.value = data.githubUsername || '';
      githubTokenInput.value = data.githubToken || '';
      repoNameInput.value = data.repoName || 'leetcode-submissions';
    });
  
    saveSettingsButton.addEventListener('click', () => {
      const leetcodeUsername = leetcodeUsernameInput.value;
      const githubUsername = githubUsernameInput.value;
      const githubToken = githubTokenInput.value;
      const repoName = repoNameInput.value;
  
      chrome.storage.local.set({ leetcodeUsername, githubUsername, githubToken, repoName }, () => {
        alert('Settings saved!');
      });
    });
  });