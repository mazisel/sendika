class Branch {
  Branch({
    required this.id,
    required this.city,
    required this.branchName,
    required this.presidentName,
    this.presidentPhone,
    this.presidentEmail,
    this.address,
    this.region,
    this.coordinatesLat,
    this.coordinatesLng,
  });

  final String id;
  final String city;
  final String branchName;
  final String presidentName;
  final String? presidentPhone;
  final String? presidentEmail;
  final String? address;
  final int? region;
  final double? coordinatesLat;
  final double? coordinatesLng;

  factory Branch.fromJson(Map<String, dynamic> json) {
    return Branch(
      id: json['id']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      branchName: json['branch_name']?.toString() ?? '',
      presidentName: json['president_name']?.toString() ?? '',
      presidentPhone: json['president_phone']?.toString(),
      presidentEmail: json['president_email']?.toString(),
      address: json['address']?.toString(),
      region: _parseInt(json['region']),
      coordinatesLat: _parseDouble(json['coordinates_lat']),
      coordinatesLng: _parseDouble(json['coordinates_lng']),
    );
  }

  static int? _parseInt(dynamic value) {
    if (value == null) {
      return null;
    }
    if (value is int) {
      return value;
    }
    return int.tryParse(value.toString());
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) {
      return null;
    }
    if (value is double) {
      return value;
    }
    if (value is num) {
      return value.toDouble();
    }
    return double.tryParse(value.toString());
  }
}
