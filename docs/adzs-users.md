# AdZS & User Accounts – Data Model and Lifecycle

_Last updated: 2025-12-19_

## 1. Domain Overview

| Entity             | Collection        | Purpose                                                                                                                    |
| ------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **User (UserDoc)** | `users`           | Stores authentication-related profile data for a person that can sign in to the app. 1-to-1 with a Firebase Auth user.     |
| **AdZS (Person)**  | `persons`         | Represents a person in the association (**A**nzugs- und **d**ienstleistungs-**Z**entrum) that may or may not have a login. |
| **Notfallkontakt** | `notfallkontakte` | Emergency contacts are stored in a separate collection and reference a person via `personId`.                              |

The **link** between the two entities is the optional field `userId` in an AdZS document. If present it stores the UID of the corresponding User.

```
 AdZS (person) ---- userId ----> User (UserDoc + Firebase Auth)
```

A person **can exist without** a user account (e.g. imported members). A user **must always** have exactly one UserDoc, but **can exist without** a linked AdZS.

---

## 2. Creation & Linking Flows

### 2.1 User registers via the app

1. User completes the registration form (email, password, first/last name).
2. `AuthService.register()`
   1. Creates Firebase Auth user.
   2. Writes a `UserDoc` to `users/{uid}`.
   3. Sends verification email.
   4. Tries to locate an existing AdZS with the same email via `PersonService.getByEmail()`.
   5. If found, sets `userId` on that AdZS (→ auto-link).

### 2.2 User logs in

On login, `AuthService.login()` runs the same _auto-link_ logic again (best-effort) to ensure the linkage exists if it was created later.

### 2.3 Admin links an existing AdZS to a User

1. Admin edits the AdZS and enters a valid email.
2. The user registers (or logs in) with that email.
3. On register/login the same auto-link logic is executed.

### 2.4 Manual unlink

`PersonService.unlinkByUserId(uid)` removes the `userId` field on the **first** matching person document (current implementation assumes 0..1 persons per user).

---

## 3. Deletion Scenarios

### 3.1 User deletes **own** account (`AuthService.deleteOwnAccount()`)

| Step | Action                                                                                   |
| ---- | ---------------------------------------------------------------------------------------- |
| 1    | `PersonService.unlinkByUserId(uid)` – removes link from the linked AdZS (first match).   |
| 2    | `FirestoreService.deleteDoc('users/{uid}')` – deletes UserDoc.                           |
| 3    | `deleteUser(currentAuthUser)` – removes Firebase Auth record.                            |
| 4    | Caller/UI handles navigation afterwards (guards will also react to the missing session). |

> 🔒 Security: Only the signed-in user can call this method; it uses the current Firebase Auth session.

### 3.2 **Admin** deletes a user (`UserService.deleteAccountByAdmin(uid)`)

| Step | Action                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| 1    | `PersonService.unlinkByUserId(uid)` – identical to self-delete.                                                 |
| 2    | Delete UserDoc as above.                                                                                        |
| 3    | `adminDeleteUser` Cloud Function is invoked to delete the Firebase Auth user (requires privileged credentials). |

This flow is exposed in the UI via the red **Löschen** button on _user-detail_ and is only visible to:

- the user themself (self-service), or
- any user whose `roles` include **admin**.

### 3.3 Deleting an **AdZS** (person)

The app uses `PersonService.deletePersonWithNotfallkontakte(personId)` which:

1. Loads all `notfallkontakte` for the person.
2. Deletes those contacts.
3. Deletes the person document (`persons/{id}`).

Deleting a person **never** deletes the linked Firebase Auth user or the `users/{uid}` document.

---

## 4. Reference – Key Methods

| Layer           | File              | Signature                                                             |
| --------------- | ----------------- | --------------------------------------------------------------------- |
| Core            | `PersonService`   | `unlinkByUserId(uid: string): Observable<void>` (first match)         |
| Core            | `PersonService`   | `deletePersonWithNotfallkontakte(personId: string): Observable<void>` |
| Core            | `AuthService`     | `deleteOwnAccount(): Observable<void>`                                |
| Core            | `UserService`     | `deleteAccountByAdmin(uid: string): Observable<void>`                 |
| Cloud Functions | `adminDeleteUser` | Deletes Firebase Auth user on behalf of admin.                        |

---

## 5. UI Touchpoints

| Page          | Component        | Button      | Visibility                                                                         |
| ------------- | ---------------- | ----------- | ---------------------------------------------------------------------------------- | --- | ------------------------- |
| `user-detail` | `UserDetailPage` | **Löschen** | Visible when `(isAdmin                                                             |     | user.uid === currentUid)` |
| `adsz-detail` | `AdzsDetailPage` | **Löschen** | Currently always shown in the UI; it deletes the person + their `notfallkontakte`. |

---

## 6. Future Work & TODOs

- Add invitation email when admin links AdZS to a new email.
- Clarify/guarantee the invariant: **at most one** person per `userId` (or update `unlinkByUserId` to unlink all matches).
