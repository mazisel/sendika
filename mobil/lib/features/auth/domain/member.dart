import 'package:equatable/equatable.dart';

class Member extends Equatable {
  const Member({
    required this.id,
    required this.membershipNumber,
    required this.firstName,
    required this.lastName,
    required this.tcIdentity,
    this.email,
    this.phone,
    this.city,
    this.district,
    this.workplace,
    this.position,
    this.membershipStatus,
    this.updatedAt,
  });

  final String id;
  final String membershipNumber;
  final String firstName;
  final String lastName;
  final String tcIdentity;
  final String? email;
  final String? phone;
  final String? city;
  final String? district;
  final String? workplace;
  final String? position;
  final String? membershipStatus;
  final DateTime? updatedAt;

  String get fullName => '$firstName $lastName';

  String get maskedTc {
    if (tcIdentity.length != 11) {
      return tcIdentity;
    }
    return '${tcIdentity.substring(0, 3)}******${tcIdentity.substring(9)}';
  }

  String get statusLabel => switch (membershipStatus) {
    'active' => 'Aktif',
    'pending' => 'Onay Bekliyor',
    'inactive' => 'Pasif',
    'suspended' => 'Askıda',
    null => 'Bilinmiyor',
    _ => membershipStatus!,
  };

  Member copyWith({
    String? membershipNumber,
    String? email,
    String? phone,
    String? city,
    String? district,
    String? workplace,
    String? position,
    String? membershipStatus,
    DateTime? updatedAt,
  }) {
    return Member(
      id: id,
      membershipNumber: membershipNumber ?? this.membershipNumber,
      firstName: firstName,
      lastName: lastName,
      tcIdentity: tcIdentity,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      city: city ?? this.city,
      district: district ?? this.district,
      workplace: workplace ?? this.workplace,
      position: position ?? this.position,
      membershipStatus: membershipStatus ?? this.membershipStatus,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      id: json['id']?.toString() ?? '',
      membershipNumber: json['membership_number']?.toString() ?? '',
      firstName: json['first_name']?.toString() ?? '',
      lastName: json['last_name']?.toString() ?? '',
      tcIdentity: json['tc_identity']?.toString() ?? '',
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      city: json['city']?.toString(),
      district: json['district']?.toString(),
      workplace: json['workplace']?.toString(),
      position: json['position']?.toString(),
      membershipStatus: json['membership_status']?.toString(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'membership_number': membershipNumber,
      'first_name': firstName,
      'last_name': lastName,
      'tc_identity': tcIdentity,
      'email': email,
      'phone': phone,
      'city': city,
      'district': district,
      'workplace': workplace,
      'position': position,
      'membership_status': membershipStatus,
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
    id,
    membershipNumber,
    firstName,
    lastName,
    tcIdentity,
    email,
    phone,
    city,
    district,
    workplace,
    position,
    membershipStatus,
    updatedAt,
  ];
}
