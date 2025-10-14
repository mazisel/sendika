class NewsItem {
  NewsItem({
    required this.id,
    required this.title,
    required this.content,
    this.excerpt,
    this.imageUrl,
    this.publishedAt,
  });

  final String id;
  final String title;
  final String content;
  final String? excerpt;
  final String? imageUrl;
  final DateTime? publishedAt;

  factory NewsItem.fromJson(Map<String, dynamic> json) {
    return NewsItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      excerpt: json['excerpt']?.toString(),
      imageUrl: json['image_url']?.toString(),
      publishedAt: json['published_at'] != null
          ? DateTime.tryParse(json['published_at'].toString())
          : null,
    );
  }

  String get preview {
    if (excerpt != null && excerpt!.isNotEmpty) {
      return excerpt!;
    }
    if (content.isEmpty) {
      return '';
    }
    final plain = content.replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), ' ');
    return plain.length > 140 ? '${plain.substring(0, 140)}...' : plain;
  }
}
