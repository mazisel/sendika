import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/member.dart';

class AuthLocalDataSource {
  AuthLocalDataSource(this._storage);

  static const _memberKey = 'ukcs_member';

  final FlutterSecureStorage _storage;

  Future<void> saveMember(Member member) async {
    await _storage.write(key: _memberKey, value: jsonEncode(member.toJson()));
  }

  Future<Member?> loadMember() async {
    final raw = await _storage.read(key: _memberKey);
    if (raw == null) {
      return null;
    }

    try {
      final Map<String, dynamic> data = jsonDecode(raw) as Map<String, dynamic>;
      return Member.fromJson(data);
    } catch (error) {
      await _storage.delete(key: _memberKey);
      return null;
    }
  }

  Future<void> clear() async {
    await _storage.delete(key: _memberKey);
  }
}
