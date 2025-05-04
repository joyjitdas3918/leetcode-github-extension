// background.js

chrome.alarms.create('checkLeetCode', { periodInMinutes: 60 }); // Check every hour

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkLeetCode') {
    console.log('Checking for new LeetCode submissions...');
    chrome.storage.local.get(['leetcodeUsername', 'githubUsername', 'githubToken', 'repoName'], async (data) => {
      if (data.leetcodeUsername && data.githubUsername && data.githubToken && data.repoName) {
        try {
          const submissions = await fetchLeetCodeSubmissions(data.leetcodeUsername);
          if (submissions && submissions.length > 0) {
            await syncToGitHub(data.githubUsername, data.repoName, submissions, data.githubToken);
          } else {
            console.log('No new accepted LeetCode submissions found.');
          }
        } catch (error) {
          console.error('Error during sync:', error);
        }
      } else {
        console.log('User not configured.');
      }
    });
  }
});

async function fetchLeetCodeSubmissions(username) {
  const submissionsUrl = `https://leetcode.com/${username}/submissions/`;
  try {
    const response = await fetch(submissionsUrl);
    if (!response.ok) {
      console.error('Failed to fetch LeetCode submissions:', response.status);
      return null;
    }
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const submissionRows = doc.querySelectorAll('tbody.ant-table-tbody > tr');
    const acceptedSubmissions = [];

    for (const row of submissionRows) {
      const columns = row.querySelectorAll('td');
      if (columns.length >= 5) {
        const status = columns[3].textContent.trim();
        if (status === 'Accepted') {
          const titleLink = columns[1].querySelector('a');
          const title = titleLink ? titleLink.textContent.trim() : '';
          const href = titleLink ? titleLink.getAttribute('href') : '';
          const titleSlug = href ? href.replace('/problems/', '').replace('/', '') : '';
          const submissionDate = columns[0].textContent.trim();
          acceptedSubmissions.push({ title, date: submissionDate, status, titleSlug });
        }
      }
    }
    return acceptedSubmissions;
  } catch (error) {
    console.error('Error fetching LeetCode submissions:', error);
    return null;
  }
}

async function syncToGitHub(githubUsername, repoName, submissions, githubToken) {
  const apiUrl = `https://api.github.com/repos/${githubUsername}/${repoName}/contents/leetcode_submissions.json`;
  const headers = {
    'Authorization': `token ${githubToken}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };

  try {
    // Get existing content (if any) to avoid overwriting
    const getResponse = await fetch(apiUrl, { method: 'GET', headers });
    let existingSubmissions = [];
    if (getResponse.ok) {
      const contentData = await getResponse.json();
      const content = atob(contentData.content);
      try {
        existingSubmissions = JSON.parse(content);
      } catch (e) {
        console.warn('Could not parse existing GitHub content:', e);
      }
    }

    // Merge new submissions with existing ones (avoiding duplicates)
    const newSubmissions = submissions.filter(newSub =>
      !existingSubmissions.some(existingSub => existingSub.titleSlug === newSub.titleSlug)
    );

    const allSubmissions = [...existingSubmissions, ...newSubmissions];
    const content = btoa(JSON.stringify(allSubmissions, null, 2)); // Base64 encode

    const body = JSON.stringify({
      message: 'Add new LeetCode submissions',
      content: content,
      sha: getResponse.ok ? (await getResponse.json()).sha : undefined // Include SHA for updates
    });

    const putResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: headers,
      body: body
    });

    if (putResponse.ok) {
      console.log('LeetCode submissions synced to GitHub.');
    } else {
      const errorData = await putResponse.json();
      console.error('Failed to sync to GitHub:', putResponse.status, errorData);
    }

  } catch (error) {
    console.error('Error syncing to GitHub:', error);
  }
}