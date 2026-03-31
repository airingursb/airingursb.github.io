---
title: "6 万部豆瓣电影数据分析"
date: 2017-01-16
tags: ["tech"]
description: ""
---

## 前言


豆瓣电影提供最新的电影介绍及评论包括上映影片的影讯查询及购票服务。你可以记录想看、在看和看过的电影电视剧，顺便打分、写影评，极大地方便了人们的生活。


豆瓣电影是这样介绍自己的：“国内最权威电影评分和精彩影评，千万影迷的真实观影感受，为你的观影做决策。”而它也确实做到了这一点。


然而，前些日子，朋友圈又因一事沸腾了。《中国电影报》12月27日发布题为“豆瓣电影评分，面临信用危机”的文章，随后人民日报客户端转发了该文，并将标题改为“豆瓣、猫眼电影评分面临信用危机，恶评伤害电影产业”。


基于此，特地把以前抓取的豆瓣电影数据拿出来分析一下，重点比较中国电影与其他国家和地区的电影的差异，以为豆瓣评分正名。



## 数据概况


这个数据只抓取到2016年上半年，总计 58127 部电影。包括id，电影名称，豆瓣评分，评分人数，上映时间，导演，主演，制片国家，影片简介等等信息。按照评分人数从高到低排序，数据库截图如下。


![](https://airing.ursb.me/image/douban/0.png)

可以发现，评分人数最多的电影是周星驰的《美人鱼》，这是一部国产片，说明国人对国产电影还是非常关心的，并不像人民日报所抨击的那样——国人崇洋媚外，不关心国产电影。


另外，也可以发现，评分人数越多，电影得分基本在7.0以上，属于中等以上的好片。（《小时代》除外）



## 各国电影质量分析


豆瓣评分最低打一星，换算成分数就是2.0分，因此豆瓣电影理论上的最低分不是0分，而是2.0分。


由于变量有点多，饼状图不直观，所以各个国家评分的百分比使用了 Treemap 来展示。


以下，选取了拍片频数比较高的15个国家和地区的数据进行简单的展示和分析。



### 美国


总电影数：16773，评分柱状图如下：
![](https://airing.ursb.me/image/douban/1.png)




![](https://airing.ursb.me/image/douban/2.png)

可以发现，美国拍片最多，但是烂片也多，基本上满足标准的良性正态分布的关系。



### 中国大陆


总电影数：7516，评分柱状图如下：
![](https://airing.ursb.me/image/douban/3.png)




![](https://airing.ursb.me/image/douban/4.png)

可以发现，中国拍片也多，但是烂片更多，好片很少，在8分出现了明显的断层现象。



### 日本


总电影数：8598，评分柱状图如下：
![](https://airing.ursb.me/image/douban/5.png)




![](https://airing.ursb.me/image/douban/6.png)

可以发现，日本电影的正态分布左移，说明其电影质量很高。



### 英国


总电影数：3667，评分柱状图如下：
![](https://airing.ursb.me/image/douban/7.png)




![](https://airing.ursb.me/image/douban/8.png)


### 法国


总电影数：3210，评分柱状图如下：
![](https://airing.ursb.me/image/douban/9.png)




![](https://airing.ursb.me/image/douban/10.png)


### 韩国


总电影数：2126，评分柱状图如下：
![](https://airing.ursb.me/image/douban/11.png)




![](https://airing.ursb.me/image/douban/12.png)


### 德国


总电影数：1344，评分柱状图如下：
![](https://airing.ursb.me/image/douban/13.png)




![](https://airing.ursb.me/image/douban/14.png)


### 加拿大


总电影数：1054，评分柱状图如下：
![](https://airing.ursb.me/image/douban/15.png)




![](https://airing.ursb.me/image/douban/16.png)


### 意大利


总电影数：1073，评分柱状图如下：
![](https://airing.ursb.me/image/douban/17.png)




![](https://airing.ursb.me/image/douban/18.png)


### 印度


总电影数：548，评分柱状图如下：
![](https://airing.ursb.me/image/douban/19.png)




![](https://airing.ursb.me/image/douban/20.png)


### 西班牙


总电影数：669，评分柱状图如下：
![](https://airing.ursb.me/image/douban/21.png)




![](https://airing.ursb.me/image/douban/22.png)


### 泰国


总电影数：598，评分柱状图如下：
![](https://airing.ursb.me/image/douban/23.png)




![](https://airing.ursb.me/image/douban/24.png)


### 澳大利亚


总电影数：454，评分柱状图如下：
![](https://airing.ursb.me/image/douban/25.png)




![](https://airing.ursb.me/image/douban/26.png)


### 中国香港


总电影数：3327，评分柱状图如下：
![](https://airing.ursb.me/image/douban/27.png)




![](https://airing.ursb.me/image/douban/28.png)


### 中国台湾


总电影数：1036，评分柱状图如下：
![](https://airing.ursb.me/image/douban/29.png)




![](https://airing.ursb.me/image/douban/30.png)


## 中国电影质量分析


说了这么多，接下来主要看看中国电影和其他国家、地区电影的比较吧。（没有对比，就没有伤害。）



### 中美电影对比


![](https://airing.ursb.me/image/douban/31.png)

首先是美国的，单单从频数折线图的趋势，看不出什么，除了数目上的差距，两者基本一样。那么换成频率折线图呢？


![](https://airing.ursb.me/image/douban/32.png)

可以发现，中等片（6.5分以上），美国的蓝线始终是高于中国的绿线。然而，在中等质量以下的片子，蓝线始终是低于绿线的，差距不是一星半点……



### 中日电影对比


再看看电影质量很好的日本，单单从频数折线图就能发现两者的巨大差距了。


![](https://airing.ursb.me/image/douban/33.png)

![](https://airing.ursb.me/image/douban/34.png)

在频率折线图中，可以发现两线的交点较中美折线图而言，左移了0.5分左右，并且两线的绝对距离也比中美折线图要大得多。可见中日电影的差距又比中美差距大了一步……如果说中美电影的差距是“望项其背”，那么中日电影的差距就是“望尘莫及”了。



### 大陆与香港电影对比


那再来看看中国大陆和中国香港的电影差距比较吧。


乍一看，还挺好的嘛~


![](https://airing.ursb.me/image/douban/35.png)

其实不然，只是大陆拍片比较多而造成的假象。当频数转成频率之后，一切又变得不一样了。


![](https://airing.ursb.me/image/douban/36.png)

可以看出在生产好片的水平上，两者半斤八两的差，而在中等片上，香港明显比大陆要好的多；在烂片上，大陆一如既往始终遥遥领先……



## 年度电影质量分析



### 近百年来的电影数目


我把每十年的电影汇总了一下，由于21世纪10年代才过去一半，所以最后一个柱状图低一点是完全正常的。去掉它之后，发现满足指数级增长的规律（可以预见未来五年会诞生出2万部影片）。


![](https://airing.ursb.me/image/douban/37.png)

![](https://airing.ursb.me/image/douban/38.png)


### 近十年每年的电影数目


近十年电影产出始终维持在一个比较高的水平。


![](https://airing.ursb.me/image/douban/39.png)


### 近十年9.5分以上的极品好片


近十年极品电影仿佛是随运气而出现，参差不齐，没有发现规律。
![](https://airing.ursb.me/image/douban/40.png)





### 近十年8分以上的好片


近十年8分以上好片的产出也始终维持在一个比较高的水平。
![](https://airing.ursb.me/image/douban/41.png)





### 近十年6分以下的烂片


但是，近十年6分以下烂片的产出居然出现逐年递增的趋势。
![](https://airing.ursb.me/image/douban/42.png)





## 后记


中国电影有待继续发展。
世界电影也有待继续发展。


让好片越来越多，烂片越来越少。
