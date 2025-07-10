# AdZS & User Accounts – Data Model and Lifecycle

_Last updated: 2025-07-10_

## 1. Domain Overview

| Entity | Collection | Purpose |
| ------ | ---------- | ------- |
| **User (UserDoc)** | `users` | Stores authentication-related profile data for a person that can sign in to the app. 1-to-1 with a Firebase Auth user. |
| **AdZS (Person)** | `persons` | Represents a person in the association (**A**nzugs- und **d**ienstleistungs-**Z**entrum) that may or may not have a login. Multiple business objects (e.g. emergency contacts, missions) reference an AdZS. |

The **link** between the two entities is the optional field `userId` in an AdZS document.  If present it stores the UID of the corresponding User.

```
 AdZS (person) ---- userId ----> User (UserDoc + Firebase Auth)
```

A person **can exist without** a user account (e.g. imported members).  A user **must always** have exactly one UserDoc, but **can exist without** a linked AdZS.

---

## 2. Creation & Linking Flows

### 2.1 User registers via the app
1. User completes the registration form (email, password, first/last name).
2. `AuthService.register()`
   1. Creates Firebase Auth user.
   2. Writes a `UserDoc` to `users/{uid}`.
   3. Tries to locate an existing AdZS with the same email via `PersonService.getByEmail()`.
   4. If found, sets `userId` on that AdZS (→ auto-link).

### 2.2 Admin links an existing AdZS to a User
1. Admin edits the AdZS and enters a valid email.
2. An invitation email is sent (todo) or the user registers manually.
3. On first login the same auto-link logic is executed.

### 2.3 Manual unlink
`PersonService.unlinkByUserId(uid)` sets `userId = null` on all persons that reference the given UID.

---

## 3. Deletion Scenarios

### 3.1 User deletes **own** account (`AuthService.deleteOwnAccount()`)
| Step | Action |
| ---- | ------ |
| 1 | `PersonService.unlinkByUserId(uid)` – removes link from **all** AdZS documents. |
| 2 | `FirestoreService.deleteDoc('users/{uid}')` – deletes UserDoc. |
| 3 | `deleteUser(currentAuthUser)` – removes Firebase Auth record. |
| 4 | Client signs out and navigates to the landing page. |

> 🔒  Security: Only the signed-in user can call this method; it uses the current Firebase Auth session.

### 3.2 **Admin** deletes a user (`UserService.deleteAccountByAdmin(uid)`)
| Step | Action |
| ---- | ------ |
| 1 | `PersonService.unlinkByUserId(uid)` – identical to self-delete. |
| 2 | Delete UserDoc as above. |
| 3 | `adminDeleteUser` Cloud Function is invoked to delete the Firebase Auth user (requires privileged credentials). |

This flow is exposed in the UI via the red **Löschen** button on *user-detail* and is only visible to:
* the user themself (self-service), or
* any user whose `roles` include **admin**.

### 3.3 Deleting an **AdZS** (person)
1. Remove or migrate dependent records (missions, emergency contacts, etc.).
2. Call `PersonService.delete(id)` (todo) which – **before deleting** – checks the `userId` field:
   * If **null** → delete immediately.
   * If **not null** → warn the admin and optionally unlink instead of delete.

> Deleting a person **never** deletes the linked user.  The user simply loses access to that person’s data.

---

## 4. Reference – Key Methods

| Layer | File | Signature |
| ----- | ---- | --------- |
| Core | `PersonService` | `unlinkByUserId(uid: string): Observable<void>` |
| Core | `AuthService` | `deleteOwnAccount(): Observable<void>` |
| Core | `UserService` | `deleteAccountByAdmin(uid: string): Observable<void>` |
| Cloud Functions | `adminDeleteUser` | Deletes Firebase Auth user on behalf of admin. |

---

## 5. UI Touchpoints

| Page | Component | Button | Visibility |
| ---- | --------- | ------ | ---------- |
| `user-detail` | `UserDetailPage` | **Löschen** | Visible when `(isAdmin || user.uid === currentUid)` |
| `adsz-detail` | (planned) | **Löschen** | Visible to admins only (will unlink or delete person). |

---

## 6. Future Work & TODOs
* Implement `adsz-detail` delete/unlink flow (issue #XYZ).
* Add invitation email when admin links AdZS to a new email.
* Audit all `where()` clauses for `undefined` guards (see memory items).
