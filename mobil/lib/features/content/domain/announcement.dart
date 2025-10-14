class Announcement {
  Announcement({
    required this.id,
    required this.title,
    required this.content,
    required this.type,
    required this.isActive,
    this.startDate,
    this.endDate,
  });

  final String id;
  final String title;
  final String content;
  final String type;
  final bool isActive;
  final DateTime? startDate;
  final DateTime? endDate;

  factory Announcement.fromJson(Map<String, dynamic> json) {
    return Announcement(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      type: json['type']?.toString() ?? 'general',
      isActive: json['is_active'] == null
          ? true
          : json['is_active'] == true || json['is_active'] == 1,
      startDate: json['start_date'] != null
          ? DateTime.tryParse(json['start_date'].toString())
          : null,
      endDate: json['end_date'] != null
          ? DateTime.tryParse(json['end_date'].toString())
          : null,
    );
  }

  String get badgeLabel => switch (type) {
    'urgent' => 'Acil',
    'info' => 'Bilgi',
    'warning' => 'Uyarı',
    _ => 'Genel',
  };
}
