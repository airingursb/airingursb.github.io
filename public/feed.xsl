<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> — RSS Feed</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f9fafb; color: #1a1a1a;
            line-height: 1.6; padding: 40px 20px;
          }
          .container { max-width: 700px; margin: 0 auto; }
          .banner {
            background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
            padding: 28px 32px; margin-bottom: 32px;
          }
          .banner-label {
            display: inline-block; font-size: 12px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.05em;
            color: #f59e0b; background: #fef3c7;
            padding: 3px 10px; border-radius: 4px; margin-bottom: 16px;
          }
          .banner h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
          .banner p { color: #6b7280; font-size: 14px; margin-bottom: 12px; }
          .banner a { color: #f59e0b; text-decoration: none; font-size: 14px; font-weight: 500; }
          .banner a:hover { text-decoration: underline; }
          .subscribe-hint {
            font-size: 13px; color: #9ca3af; margin-top: 12px;
            padding-top: 12px; border-top: 1px solid #f3f4f6;
          }
          .subscribe-hint code {
            background: #f3f4f6; padding: 2px 6px; border-radius: 4px;
            font-size: 12px; color: #374151; user-select: all;
          }
          .post-list { list-style: none; }
          .post-item {
            background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
            padding: 20px 24px; margin-bottom: 12px;
            transition: border-color 0.15s;
          }
          .post-item:hover { border-color: #d1d5db; }
          .post-item a { text-decoration: none; color: inherit; display: block; }
          .post-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; color: #1a1a1a; }
          .post-meta { font-size: 13px; color: #9ca3af; }
          .post-meta span + span::before { content: " · "; }
          .post-desc { font-size: 14px; color: #6b7280; margin-top: 8px; line-height: 1.5; }
          .tags { margin-top: 8px; }
          .tag {
            display: inline-block; font-size: 12px; color: #6b7280;
            background: #f3f4f6; padding: 2px 8px; border-radius: 4px;
            margin-right: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="banner">
            <div class="banner-label">RSS Feed</div>
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p><xsl:value-of select="/rss/channel/description"/></p>
            <xsl:choose>
              <xsl:when test="contains(/rss/channel/title, 'Notes')">
                <a>
                  <xsl:attribute name="href"><xsl:value-of select="/rss/channel/link"/>notes</xsl:attribute>
                  访问笔记 →
                </a>
                <div class="subscribe-hint">
                  复制下方链接到你的 RSS 阅读器即可订阅：<br/>
                  <code>https://ursb.me/notes/feed.xml</code>
                </div>
              </xsl:when>
              <xsl:otherwise>
                <a>
                  <xsl:attribute name="href"><xsl:value-of select="/rss/channel/link"/>blog</xsl:attribute>
                  访问博客 →
                </a>
                <div class="subscribe-hint">
                  复制下方链接到你的 RSS 阅读器即可订阅：<br/>
                  <code>https://ursb.me/blog/feed.xml</code>
                </div>
              </xsl:otherwise>
            </xsl:choose>
          </div>
          <ul class="post-list">
            <xsl:for-each select="/rss/channel/item">
              <li class="post-item">
                <a>
                  <xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>
                  <div class="post-title"><xsl:value-of select="title"/></div>
                  <div class="post-meta">
                    <span><xsl:value-of select="pubDate"/></span>
                  </div>
                  <xsl:if test="description and description != ''">
                    <div class="post-desc"><xsl:value-of select="description"/></div>
                  </xsl:if>
                  <xsl:if test="category">
                    <div class="tags">
                      <xsl:for-each select="category">
                        <span class="tag"><xsl:value-of select="."/></span>
                      </xsl:for-each>
                    </div>
                  </xsl:if>
                </a>
              </li>
            </xsl:for-each>
          </ul>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
