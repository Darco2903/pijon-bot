const HTMLParser = require("node-html-parser");

/**
 * @typedef {Object} Video
 * @property {string} channel - The video channel
 * @property {string} duration - The video duration
 * @property {string} published - The video published date
 * @property {Object[]} thumbnail - The video thumbnail
 * @property {string} thumbnail.url - The thumbnail URL
 * @property {number} thumbnail.width - The thumbnail width
 * @property {number} thumbnail.height - The thumbnail height
 * @property {string} title - The video title
 * @property {string} videoId - The video ID
 * @property {string} views - The video views
 */

/**
 * Search for videos on YouTube
 * @param {string} query - The search query
 * @param {number} maxResults - The maximum number of results to return
 * @returns {Promise<Video[]>} - The search results
 */
async function searchYoutube(query, maxResults = 5) {
    const q = query.replaceAll(/ /g, "+");
    const res = await fetch(`https://www.youtube.com/results?search_query=${q}`);
    const body = await res.text();
    const html = HTMLParser.parse(body);
    const script = html.querySelectorAll("script[nonce]").find((el) => el.innerHTML.includes("videoId")).innerHTML;
    eval(script); // var ytInitialData = {...}

    /** @type {any[]} */
    const videos = ytInitialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
    return videos
        .filter((el) => el.videoRenderer)
        .slice(0, maxResults)
        .map((el) => {
            return {
                videoId: el.videoRenderer.videoId,
                title: el.videoRenderer.title.runs[0].text,
                channel: el.videoRenderer.ownerText.runs[0].text,
                thumbnail: el.videoRenderer.thumbnail?.thumbnails,
                published: el.videoRenderer.publishedTimeText?.simpleText,
                duration: el.videoRenderer.lengthText?.simpleText,
                views: el.videoRenderer.viewCountText?.simpleText,
            };
        });
}

module.exports = searchYoutube;
