import 'dart:convert';

class ContentAttachment {
  ContentAttachment({
    required this.name,
    required this.url,
    this.type,
    this.size,
  });

  final String name;
  final String url;
  final String? type;
  final int? size;

  factory ContentAttachment.fromJson(Map<String, dynamic> json) {
    return ContentAttachment(
      name: json['name']?.toString() ?? json['title']?.toString() ?? 'Ek',
      url: json['url']?.toString() ?? json['link']?.toString() ?? '',
      type: json['type']?.toString(),
      size: _parseSize(json['size']),
    );
  }

  static List<ContentAttachment> listFromRaw(dynamic raw) {
    if (raw == null) {
      return [];
    }
    if (raw is String) {
      try {
        final decoded = jsonDecode(raw);
        return listFromRaw(decoded);
      } catch (_) {
        return [];
      }
    }
    if (raw is Map) {
      return [ContentAttachment.fromJson(Map<String, dynamic>.from(raw))];
    }
    if (raw is List) {
      return raw
          .map((item) {
            if (item is ContentAttachment) {
              return item;
            }
            if (item is Map) {
              return ContentAttachment.fromJson(
                Map<String, dynamic>.from(item),
              );
            }
            return null;
          })
          .whereType<ContentAttachment>()
          .toList();
    }
    return [];
  }

  static int? _parseSize(dynamic value) {
    if (value == null) {
      return null;
    }
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    final parsed = int.tryParse(value.toString());
    return parsed;
  }
}
