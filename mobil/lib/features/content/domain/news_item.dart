import 'content_attachment.dart';

class NewsItem {
  NewsItem({
    required this.id,
    required this.title,
    required this.content,
    this.excerpt,
    this.imageUrl,
    this.publishedAt,
    this.attachments = const [],
  });

  final String id;
  final String title;
  final String content;
  final String? excerpt;
  final String? imageUrl;
  final DateTime? publishedAt;
  final List<ContentAttachment> attachments;

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
      attachments: ContentAttachment.listFromRaw(json['attachments']),
    );
  }

  String get preview {
    if (excerpt != null && excerpt!.isNotEmpty) {
      return excerpt!;
    }
    final cleaned = plainText;
    if (cleaned.isEmpty) {
      return '';
    }
    return cleaned.length > 140 ? '${cleaned.substring(0, 140)}...' : cleaned;
  }

  String get plainText {
    final plain = content.replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), ' ');
    return plain.replaceAll(RegExp(r'\\s+'), ' ').trim();
  }
}
